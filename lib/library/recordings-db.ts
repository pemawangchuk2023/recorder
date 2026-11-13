import type { LibraryFolder, LibraryRecording } from "@/lib/library/types";

// IndexedDB keeps Blobs on disk, not in memory, so long recordings are fine.
// Details and files live in separate stores: listing the library reads only
// the small details, never the videos.
const DB_NAME = "screen-recorder-library";
// Version 2 added folders.
const DB_VERSION = 2;
const DETAILS = "recordings";
const FILES = "files";
const FOLDERS = "folders";

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
        if (!db.objectStoreNames.contains(FOLDERS)) {
          db.createObjectStore(FOLDERS, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // A tab running a newer version of the app needs this one to let go.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
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

export async function readAllFolders(): Promise<LibraryFolder[]> {
  const db = await openDb();
  return result(db.transaction(FOLDERS).objectStore(FOLDERS).getAll() as IDBRequest<LibraryFolder[]>);
}

export async function writeFolder(folder: LibraryFolder): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(FOLDERS, "readwrite");
  transaction.objectStore(FOLDERS).put(folder);
  await done(transaction);
}

// Files the given recordings in a folder (or in none), all or nothing.
export async function writeFolderOf(ids: string[], folderId: string | null): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(DETAILS, "readwrite");
  const store = transaction.objectStore(DETAILS);
  const now = Date.now();
  ids.forEach((id) => {
    const request = store.get(id) as IDBRequest<LibraryRecording | undefined>;
    request.onsuccess = () => {
      if (request.result) {
        store.put({ ...request.result, folderId, updatedAt: now });
      }
    };
  });
  await done(transaction);
}

// Removes a folder; the recordings in it are kept and become unfiled.
export async function removeFolder(id: string): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction([DETAILS, FOLDERS], "readwrite");
  transaction.objectStore(FOLDERS).delete(id);
  const store = transaction.objectStore(DETAILS);
  const request = store.getAll() as IDBRequest<LibraryRecording[]>;
  request.onsuccess = () => {
    request.result
      .filter((recording) => recording.folderId === id)
      .forEach((recording) => store.put({ ...recording, folderId: null }));
  };
  await done(transaction);
}

// Replaces a recording's thumbnail, leaving its video as it is.
export async function writeThumbnail(details: LibraryRecording, thumbnail: Blob): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction([DETAILS, FILES], "readwrite");
  const files = transaction.objectStore(FILES);
  const request = files.get(details.id) as IDBRequest<StoredFiles | undefined>;
  request.onsuccess = () => {
    if (request.result) {
      files.put({ ...request.result, thumbnail });
      transaction.objectStore(DETAILS).put(details);
    }
  };
  await done(transaction);
}
