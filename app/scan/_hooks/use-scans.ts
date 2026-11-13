import { useEffect, useState } from "react";
import {
  canStoreScans,
  getDocument,
  getPages,
  listDocuments,
  subscribeToScans,
  type ScanDocument,
  type ScanPage,
} from "@/app/scan/_lib/scans";

const BLOCKED =
  "Scans couldn't be opened. Private windows and some privacy settings block the browser storage they are kept in.";

export type ScansState =
  | { status: "loading" }
  | { status: "ready"; documents: ScanDocument[] }
  | { status: "error"; message: string };

// Every scanned document in this browser, most recently changed first.
export function useScans(): ScansState {
  const [state, setState] = useState<ScansState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!canStoreScans()) {
        setState({ status: "error", message: "This browser can't store scans." });
        return;
      }
      listDocuments()
        .then((documents) => !cancelled && setState({ status: "ready", documents }))
        .catch(() => !cancelled && setState({ status: "error", message: BLOCKED }));
    };
    queueMicrotask(load);
    const unsubscribe = subscribeToScans(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);
  return state;
}

export type ScanDocumentState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; document: ScanDocument; pages: ScanPage[] }
  | { status: "error"; message: string };

// One document with its pages, kept up to date as they change.
export function useScanDocument(id: string): ScanDocumentState {
  const [state, setState] = useState<{ id: string; value: ScanDocumentState } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const document = await getDocument(id);
        const value: ScanDocumentState = document
          ? { status: "ready", document, pages: await getPages(document) }
          : { status: "missing" };
        if (!cancelled) {
          setState({ id, value });
        }
      } catch {
        if (!cancelled) {
          setState({ id, value: { status: "error", message: BLOCKED } });
        }
      }
    };
    void load();
    const unsubscribe = subscribeToScans(() => void load());
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id]);
  return state?.id === id ? state.value : { status: "loading" };
}
