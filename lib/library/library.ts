import {
  readAllDetails,
  readDetails,
  readFiles,
  removeRecordings,
  writeDetails,
  writeRecording,
} from "@/lib/library/recordings-db";
import type { LibraryRecording, NewLibraryRecording } from "@/lib/library/types";
import { readVideoDetails } from "@/lib/library/video-details";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";

// The public face of the library: every change goes through here, so every
// open page (this tab and others) hears about it.
const CHANNEL_NAME = "screen-recorder-library";
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
  channel?.postMessage("changed");
}

export function subscribeToLibrary(listener: () => void): () => void {
  if (!channel && typeof BroadcastChannel === "function") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => listeners.forEach((each) => each());
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function listRecordings(): Promise<LibraryRecording[]> {
  const all = await readAllDetails();
  return all.sort((a, b) => b.createdAt - a.createdAt);
}

export function getRecording(id: string): Promise<LibraryRecording | null> {
  return readDetails(id);
}

export async function getRecordingVideo(id: string): Promise<Blob | null> {
  return (await readFiles(id))?.video ?? null;
}

export async function getRecordingThumbnail(id: string): Promise<Blob | null> {
  return (await readFiles(id))?.thumbnail ?? null;
}

export async function addRecording({ title, video, transcript }: NewLibraryRecording): Promise<LibraryRecording> {
  const details = await readVideoDetails(video);
  const now = Date.now();
  const recording: LibraryRecording = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    duration: details.duration,
    size: video.size,
    codec: details.codec,
    width: details.width,
    height: details.height,
    transcript,
  };
  await writeRecording(recording, { id: recording.id, video, thumbnail: details.thumbnail });
  notify();
  return recording;
}

// After a trim (or undoing one): the entry keeps its id, title and date.
export async function replaceRecordingVideo(
  id: string,
  video: Blob,
  transcript: TranscriptSegment[]
): Promise<void> {
  const existing = await readDetails(id);
  if (!existing) {
    return;
  }
  const details = await readVideoDetails(video);
  await writeRecording(
    {
      ...existing,
      updatedAt: Date.now(),
      duration: details.duration,
      size: video.size,
      codec: details.codec,
      width: details.width,
      height: details.height,
      transcript,
    },
    { id, video, thumbnail: details.thumbnail }
  );
  notify();
}

export async function renameRecording(id: string, title: string): Promise<void> {
  const existing = await readDetails(id);
  const trimmed = title.trim();
  if (!existing || !trimmed || existing.title === trimmed) {
    return;
  }
  await writeDetails({ ...existing, title: trimmed, updatedAt: Date.now() });
  notify();
}

export async function deleteRecordings(ids: string[] | "all"): Promise<void> {
  await removeRecordings(ids);
  notify();
}

export interface StorageInfo {
  used: number;
  quota: number;
  persisted: boolean;
}

export async function getStorageInfo(): Promise<StorageInfo | null> {
  if (!navigator.storage?.estimate) {
    return null;
  }
  const [{ usage = 0, quota = 0 }, persisted] = await Promise.all([
    navigator.storage.estimate(),
    navigator.storage.persisted?.() ?? Promise.resolve(false),
  ]);
  return { used: usage, quota, persisted };
}

// Without this, the browser may clear the library when the disk runs low.
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export function isQuotaError(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === "QuotaExceededError";
}
