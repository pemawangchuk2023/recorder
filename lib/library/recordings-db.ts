import type { LibraryRecording } from "@/lib/library/types";

// IndexedDB keeps Blobs on disk, not in memory, so long recordings are fine.
// Details and files live in separate stores: listing the library reads only
// the small details, never the videos.
const DB_NAME = "screen-recorder-library";
const DB_VERSION = 1;
const DETAILS = "recordings";
const FILES = "files";

interface StoredFiles {
  id: string;
  video: Blob;
  thumbnail: Blob | null;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DETAILS)) {
          db.createObjectStore(DETAILS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(FILES)) {
          db.createObjectStore(FILES, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Aborted"));
  });
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function isLibraryAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export async function readAllDetails(): Promise<LibraryRecording[]> {
  const db = await openDb();
  return result(db.transaction(DETAILS).objectStore(DETAILS).getAll() as IDBRequest<LibraryRecording[]>);
}

export async function readDetails(id: string): Promise<LibraryRecording | null> {
  const db = await openDb();
  const found = await result(db.transaction(DETAILS).objectStore(DETAILS).get(id));
  return (found as LibraryRecording | undefined) ?? null;
}

export async function readFiles(id: string): Promise<StoredFiles | null> {
  const db = await openDb();
  const found = await result(db.transaction(FILES).objectStore(FILES).get(id));
  return (found as StoredFiles | undefined) ?? null;
}

// Details and files are written together, so a library entry never points
// at a missing video.
export async function writeRecording(details: LibraryRecording, files: StoredFiles): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction([DETAILS, FILES], "readwrite");
  transaction.objectStore(DETAILS).put(details);
  transaction.objectStore(FILES).put(files);
  await done(transaction);
}

export async function writeDetails(details: LibraryRecording): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(DETAILS, "readwrite");
  transaction.objectStore(DETAILS).put(details);
  await done(transaction);
}

export async function removeRecordings(ids: string[] | "all"): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction([DETAILS, FILES], "readwrite");
  for (const name of [DETAILS, FILES]) {
    const store = transaction.objectStore(name);
    if (ids === "all") {
      store.clear();
    } else {
      ids.forEach((id) => store.delete(id));
    }
  }
  await done(transaction);
}
