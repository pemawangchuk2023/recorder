import type { StreamTargetChunk } from "mediabunny";
import { completePrefixLength } from "@/lib/takes/mp4-boxes";
import { remuxToMp4 } from "@/lib/takes/remux";

// While a take is being recorded it is written straight to a private file on
// this device (the browser's Origin Private File System), a few seconds at a
// time. If the tab crashes, is closed, or the disk fills up, that file still
// holds everything up to the last few seconds, and the recorder offers it
// back on the next visit. Nothing here ever leaves the device.

const DIRECTORY = "takes-in-progress";
// Takes that reached the library; their files are removed on the next visit.
const SAVED_KEY = "recorder-saved-takes-v1";
// A tab holds this lock for as long as it is using a take's file, so other
// tabs can tell a live recording from an abandoned one.
const LOCK_PREFIX = "recorder-take:";
const OPEN_TIMEOUT_MS = 4000;

// Up to this size the finished take is rewritten in memory as a regular MP4.
// Longer takes stay on disk as they were written (a fragmented MP4), so a
// multi-hour recording never has to fit in memory.
export const IN_MEMORY_FINISH_LIMIT = 1024 * 1024 * 1024;

// The file is written from a worker: only workers get a handle that writes in
// place. (The page-side API writes to a temporary copy that is thrown away if
// the tab dies, which is exactly the case this is for.)
const WORKER_SOURCE = `
let handle = null;
let lastFlush = 0;
onmessage = async (event) => {
  const message = event.data;
  try {
    if (message.type === "open") {
      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle(message.directory, { create: true });
      const file = await directory.getFileHandle(message.name, { create: true });
      handle = await file.createSyncAccessHandle();
      handle.truncate(0);
    } else if (message.type === "write") {
      const data = new Uint8Array(message.data);
      let written = 0;
      while (written < data.byteLength) {
        const count = handle.write(data.subarray(written), { at: message.position + written });
        if (!(count > 0)) {
          throw new DOMException("The disk is full.", "QuotaExceededError");
        }
        written += count;
      }
      const now = Date.now();
      if (now - lastFlush > 1000) {
        handle.flush();
        lastFlush = now;
      }
    } else if (message.type === "close") {
      if (handle) {
        handle.flush();
        handle.close();
        handle = null;
      }
    }
    postMessage({ id: message.id, ok: true });
  } catch (cause) {
    postMessage({ id: message.id, ok: false, name: cause && cause.name, message: String(cause) });
  }
};
`;

export interface TakeFile {
  // Where the encoder writes; each write waits until the bytes are in the file.
  writable: WritableStream<StreamTargetChunk>;
  // Closes the file and returns the take: everything that was completely written.
  finish: () => Promise<Blob>;
  // Closes and deletes the file.
  discard: () => Promise<void>;
}

export interface RecoverableTake {
  name: string;
  // Milliseconds since the epoch.
  startedAt: number;
  size: number;
}

interface RegisteredTake {
  name: string;
  // True when the blob reads from the file itself, which must then stay.
  usesFile: boolean;
  release: () => void;
}

const registry = new WeakMap<Blob, RegisteredTake>();

export function canRecordToDisk(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage?.getDirectory === "function" &&
    typeof navigator.locks?.request === "function" &&
    typeof Worker === "function"
  );
}

async function takesDirectory(create: boolean): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIRECTORY, { create });
}

function holdLock(name: string): () => void {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  void navigator.locks.request(LOCK_PREFIX + name, () => held).catch(() => {});
  return release;
}

function readSavedNames(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.filter((name): name is string => typeof name === "string") : [];
  } catch {
    return [];
  }
}

function writeSavedNames(names: string[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(names));
  } catch {
    // Without it, a saved take is merely offered for recovery once more.
  }
}

export async function deleteTake(name: string): Promise<void> {
  try {
    await (await takesDirectory(false)).removeEntry(name);
  } catch {
    // Already gone.
  }
}

// The finished take, as playable as it can be made.
async function readTake(file: Blob): Promise<{ blob: Blob; usesFile: boolean }> {
  const length = await completePrefixLength(file);
  if (length === 0) {
    throw new Error("The recording holds no video yet.");
  }
  const complete = length === file.size ? file : file.slice(0, length);
  if (complete.size <= IN_MEMORY_FINISH_LIMIT) {
    try {
      return { blob: await remuxToMp4(complete), usesFile: false };
    } catch {
      // Too large for memory after all, or unreadable as a whole: keep the
      // file as it was written, which still plays.
    }
  }
  return { blob: complete.slice(0, complete.size, "video/mp4"), usesFile: true };
}

// Starts a new take file. Resolves to null when this browser can't write one
// (the recorder then keeps the take in memory, as it always did).
export async function openTakeFile(): Promise<TakeFile | null> {
  if (!canRecordToDisk()) {
    return null;
  }
  const name = `take-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`;
  const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
  const worker = new Worker(url);
  URL.revokeObjectURL(url);

  let nextId = 1;
  const pending = new Map<number, { resolve: () => void; reject: (cause: Error) => void }>();
  let failure: Error | null = null;
  const failAll = (cause: Error) => {
    failure = cause;
    pending.forEach(({ reject }) => reject(cause));
    pending.clear();
  };
  worker.onmessage = (event: MessageEvent<{ id: number; ok: boolean; name?: string; message?: string }>) => {
    const waiting = pending.get(event.data.id);
    pending.delete(event.data.id);
    if (!waiting) {
      return;
    }
    if (event.data.ok) {
      waiting.resolve();
    } else {
      waiting.reject(new DOMException(event.data.message ?? "Writing failed.", event.data.name ?? "Error"));
    }
  };
  worker.onerror = () => failAll(new Error("The recording file's writer stopped."));

  const call = (message: Record<string, unknown>, transfer: Transferable[] = []): Promise<void> => {
    if (failure) {
      return Promise.reject(failure);
    }
    return new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      worker.postMessage({ ...message, id }, transfer);
    });
  };

  const release = holdLock(name);
  try {
    await Promise.race([
      call({ type: "open", directory: DIRECTORY, name }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Opening the recording file took too long.")), OPEN_TIMEOUT_MS)
      ),
    ]);
  } catch {
    worker.terminate();
    release();
    void deleteTake(name);
    return null;
  }

  let closed = false;
  const close = async () => {
    if (closed) {
      return;
    }
    closed = true;
    await call({ type: "close" }).catch(() => {});
    // Ending the worker also frees the file if closing it failed.
    worker.terminate();
  };

  const writable = new WritableStream<StreamTargetChunk>({
    write(chunk) {
      // Copied, because the encoder may reuse its buffer after this returns.
      const data = chunk.data.slice();
      return call({ type: "write", data: data.buffer, position: chunk.position }, [data.buffer]);
    },
  });

  return {
    writable,
    async finish() {
      await close();
      try {
        const file = await (await (await takesDirectory(false)).getFileHandle(name)).getFile();
        const take = await readTake(file);
        registry.set(take.blob, { name, usesFile: take.usesFile, release });
        return take.blob;
      } catch (cause) {
        // Nothing usable was written; leave no empty file behind.
        await deleteTake(name);
        release();
        throw cause;
      }
    },
    async discard() {
      await close();
      await deleteTake(name);
      release();
    },
  };
}

// Called once a take is safely in the library: its file is no longer the
// only copy, so it can go.
export function markTakeSaved(blob: Blob): void {
  const take = registry.get(blob);
  if (!take) {
    return;
  }
  registry.delete(blob);
  if (take.usesFile) {
    // The page is still playing from the file; it's removed on the next visit.
    writeSavedNames([...readSavedNames(), take.name]);
    return;
  }
  void deleteTake(take.name).then(take.release);
}

function startedAtOf(name: string): number {
  const stamp = Number(/^take-(\d+)-/.exec(name)?.[1]);
  return Number.isFinite(stamp) ? stamp : 0;
}

// Take files no open tab is using and the library never received: recordings
// that were interrupted. Also clears out files that are no longer needed.
export async function findRecoverableTakes(): Promise<RecoverableTake[]> {
  if (!canRecordToDisk()) {
    return [];
  }
  let directory: FileSystemDirectoryHandle;
  try {
    directory = await takesDirectory(false);
  } catch {
    return [];
  }
  const locks = await navigator.locks.query();
  const inUse = new Set((locks.held ?? []).map((lock) => lock.name));
  const saved = new Set(readSavedNames());
  const stillSaved: string[] = [];
  const takes: RecoverableTake[] = [];

  const entries = (directory as unknown as { entries(): AsyncIterable<[string, FileSystemHandle]> }).entries();
  for await (const [name, handle] of entries) {
    if (handle.kind !== "file") {
      continue;
    }
    if (inUse.has(LOCK_PREFIX + name)) {
      if (saved.has(name)) {
        stillSaved.push(name);
      }
      continue;
    }
    const file = await (handle as FileSystemFileHandle).getFile().catch(() => null);
    if (saved.has(name) || !file || (await completePrefixLength(file).catch(() => 0)) === 0) {
      await directory.removeEntry(name).catch(() => {});
      continue;
    }
    takes.push({ name, startedAt: startedAtOf(name) || file.lastModified, size: file.size });
  }
  if (saved.size > 0) {
    writeSavedNames(stillSaved);
  }
  return takes.sort((a, b) => b.startedAt - a.startedAt);
}

// Reads an interrupted take back as a playable video. The file stays until
// deleteTake() is called, so a failed save can be tried again.
export async function recoverTake(name: string): Promise<Blob> {
  const file = await (await (await takesDirectory(false)).getFileHandle(name)).getFile();
  return (await readTake(file)).blob;
}
