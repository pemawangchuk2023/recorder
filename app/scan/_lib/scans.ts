import type { ScanFilter } from "@/app/scan/_lib/filters";
import type { Corners } from "@/app/scan/_lib/geometry";
import { buildPdf, type PageSize } from "@/app/scan/_lib/pdf";
import {
  findCorners,
  makeThumbnail,
  preparePhoto,
  renderPage,
  type PageSettings,
} from "@/app/scan/_lib/process-page";

// Scanned documents live in this browser's own storage (IndexedDB), like
// recordings do: nothing is uploaded, and clearing site data removes them.
// Each page keeps the photo it came from, so its corners and look can be
// changed again later without scanning anew.

export interface ScanDocument {
  id: string;
  title: string;
  // Milliseconds since the epoch.
  createdAt: number;
  updatedAt: number;
  // The pages, in reading order.
  pageIds: string[];
  // A small picture of the first page.
  thumbnail: Blob | null;
  // Bytes stored for this document: photos and finished pages.
  size: number;
}

export interface ScanPage extends PageSettings {
  id: string;
  documentId: string;
  // The photo as taken (made upright, and no larger than needed).
  photo: Blob;
  // The finished page.
  image: Blob;
  width: number;
  height: number;
  // False when no page edge was found and the whole photo is used.
  edgesFound: boolean;
}

const DB_NAME = "document-scanner";
const DB_VERSION = 1;
const DOCUMENTS = "documents";
const PAGES = "pages";
const CHANNEL_NAME = "document-scanner";
export const DEFAULT_FILTER: ScanFilter = "enhance";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DOCUMENTS)) {
          db.createObjectStore(DOCUMENTS, { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains(PAGES)) {
          db.createObjectStore(PAGES, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
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

const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
  channel?.postMessage("changed");
}

// Hears about every change, made in this tab or another.
export function subscribeToScans(listener: () => void): () => void {
  if (!channel && typeof BroadcastChannel === "function") {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => listeners.forEach((each) => each());
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canStoreScans(): boolean {
  return typeof indexedDB !== "undefined";
}

export function isStorageFull(cause: unknown): boolean {
  return cause instanceof DOMException && cause.name === "QuotaExceededError";
}

export async function listDocuments(): Promise<ScanDocument[]> {
  const db = await openDb();
  const all = await result(db.transaction(DOCUMENTS).objectStore(DOCUMENTS).getAll() as IDBRequest<ScanDocument[]>);
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDocument(id: string): Promise<ScanDocument | null> {
  const db = await openDb();
  const found = await result(db.transaction(DOCUMENTS).objectStore(DOCUMENTS).get(id) as IDBRequest<ScanDocument | undefined>);
  return found ?? null;
}

// A document's pages, in reading order.
export async function getPages(document: ScanDocument): Promise<ScanPage[]> {
  const db = await openDb();
  const store = db.transaction(PAGES).objectStore(PAGES);
  const pages = await Promise.all(
    document.pageIds.map((id) => result(store.get(id) as IDBRequest<ScanPage | undefined>))
  );
  return pages.filter((page): page is ScanPage => page !== undefined);
}

const TITLE_DATE = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

async function sizeOf(db: IDBDatabase, pageIds: string[]): Promise<number> {
  const store = db.transaction(PAGES).objectStore(PAGES);
  const pages = await Promise.all(pageIds.map((id) => result(store.get(id) as IDBRequest<ScanPage | undefined>)));
  return pages.reduce((total, page) => total + (page ? page.photo.size + page.image.size : 0), 0);
}

// Writes the document with its size and cover brought up to date.
async function saveDocument(document: ScanDocument, firstPage?: ScanPage | null): Promise<void> {
  const db = await openDb();
  let thumbnail = document.thumbnail;
  if (firstPage !== undefined) {
    thumbnail = firstPage ? await makeThumbnail(firstPage.image).catch(() => null) : null;
  }
  const size = await sizeOf(db, document.pageIds);
  const transaction = db.transaction(DOCUMENTS, "readwrite");
  transaction.objectStore(DOCUMENTS).put({ ...document, thumbnail, size, updatedAt: Date.now() });
  await done(transaction);
}

async function firstPageOf(document: ScanDocument): Promise<ScanPage | null> {
  if (document.pageIds.length === 0) {
    return null;
  }
  const db = await openDb();
  const page = await result(db.transaction(PAGES).objectStore(PAGES).get(document.pageIds[0]) as IDBRequest<ScanPage | undefined>);
  return page ?? null;
}

// Adds photos as new pages at the end, creating the document when none is
// given. Each photo is straightened and cleaned up on the way in.
// `onProgress` is called before each photo with how many are done.
export async function addPhotos(
  documentId: string | null,
  photos: Blob[],
  onProgress?: (done: number, total: number) => void
): Promise<ScanDocument> {
  const db = await openDb();
  const now = Date.now();
  let document: ScanDocument =
    (documentId ? await getDocument(documentId) : null) ??
    ({
      id: crypto.randomUUID(),
      title: `Scan · ${TITLE_DATE.format(new Date(now))}`,
      createdAt: now,
      updatedAt: now,
      pageIds: [],
      thumbnail: null,
      size: 0,
    } satisfies ScanDocument);
  const hadPages = document.pageIds.length > 0;

  try {
    for (const [index, file] of photos.entries()) {
      onProgress?.(index, photos.length);
      const photo = await preparePhoto(file);
      const { corners, found } = await findCorners(photo);
      const settings: PageSettings = { corners, filter: DEFAULT_FILTER, turns: 0 };
      const rendered = await renderPage(photo, settings);
      const page: ScanPage = {
        id: crypto.randomUUID(),
        documentId: document.id,
        photo,
        ...settings,
        ...rendered,
        edgesFound: found,
      };
      const transaction = db.transaction(PAGES, "readwrite");
      transaction.objectStore(PAGES).put(page);
      await done(transaction);
      document = { ...document, pageIds: [...document.pageIds, page.id] };
    }
  } finally {
    // Whatever was added before a failure is kept and shown.
    if (document.pageIds.length > 0) {
      await saveDocument(document, hadPages ? undefined : await firstPageOf(document));
      notify();
    }
  }
  onProgress?.(photos.length, photos.length);
  return document;
}

// Re-makes a page with new corners, look or rotation.
export async function updatePage(page: ScanPage, settings: PageSettings): Promise<void> {
  const rendered = await renderPage(page.photo, settings);
  const db = await openDb();
  const next: ScanPage = { ...page, ...settings, ...rendered };
  const transaction = db.transaction(PAGES, "readwrite");
  transaction.objectStore(PAGES).put(next);
  await done(transaction);
  const document = await getDocument(page.documentId);
  if (document) {
    await saveDocument(document, document.pageIds[0] === page.id ? next : undefined);
  }
  notify();
}

export async function deletePage(page: ScanPage): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(PAGES, "readwrite");
  transaction.objectStore(PAGES).delete(page.id);
  await done(transaction);
  const document = await getDocument(page.documentId);
  if (document) {
    const next = { ...document, pageIds: document.pageIds.filter((id) => id !== page.id) };
    await saveDocument(next, await firstPageOf(next));
  }
  notify();
}

// Moves a page one place earlier (-1) or later (+1).
export async function movePage(document: ScanDocument, pageId: string, direction: -1 | 1): Promise<void> {
  const from = document.pageIds.indexOf(pageId);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= document.pageIds.length) {
    return;
  }
  const pageIds = [...document.pageIds];
  [pageIds[from], pageIds[to]] = [pageIds[to], pageIds[from]];
  const next = { ...document, pageIds };
  await saveDocument(next, from === 0 || to === 0 ? await firstPageOf(next) : undefined);
  notify();
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const document = await getDocument(id);
  const trimmed = title.trim().slice(0, 120);
  if (!document || !trimmed || trimmed === document.title) {
    return;
  }
  await saveDocument({ ...document, title: trimmed });
  notify();
}

export async function deleteDocument(id: string): Promise<void> {
  const document = await getDocument(id);
  const db = await openDb();
  const transaction = db.transaction([DOCUMENTS, PAGES], "readwrite");
  transaction.objectStore(DOCUMENTS).delete(id);
  document?.pageIds.forEach((pageId) => transaction.objectStore(PAGES).delete(pageId));
  await done(transaction);
  notify();
}

// The whole document as one PDF, a page per sheet.
export async function documentPdf(document: ScanDocument, size: PageSize): Promise<Blob> {
  const pages = await getPages(document);
  if (pages.length === 0) {
    throw new Error("This document has no pages yet.");
  }
  const pdf = buildPdf(
    await Promise.all(
      pages.map(async (page) => ({
        jpeg: new Uint8Array(await page.image.arrayBuffer()),
        width: page.width,
        height: page.height,
      }))
    ),
    { title: document.title, size }
  );
  return new Blob([pdf as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

export type { Corners };
