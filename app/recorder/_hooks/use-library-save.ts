import { useCallback, useEffect, useRef, useState } from "react";
import type { Chapter, TranscriptSegment } from "@/app/recorder/_lib/types";
import {
  addRecording,
  deleteRecordings,
  isQuotaError,
  renameRecording,
  replaceRecordingVideo,
  updateRecording,
} from "@/lib/library/library";
import { isLibraryAvailable } from "@/lib/library/recordings-db";
import { defaultRecordingTitle } from "@/lib/library/titles";

export type LibrarySaveStatus = "saving" | "saved" | "failed" | "full" | "unavailable";

export interface FinishedRecording {
  // The take as recorded; identifies it across trims.
  source: Blob;
  // The current version: the source, or a trimmed copy of it.
  blob: Blob;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
}

export interface LibrarySave {
  status: LibrarySaveStatus;
  title: string;
  // Resolves to the take's library id, or null if it isn't in the library.
  id: () => Promise<string | null>;
  rename: (title: string) => void;
  // Deletes the take from the library.
  remove: () => Promise<void>;
}

interface SavedTake {
  // Resolves to the library id, or null if saving failed.
  id: Promise<string | null>;
  // The version last written, so a trim (or its undo) replaces it once.
  savedBlob: Blob;
  savedChapters: Chapter[];
}

// Every finished take goes straight into the library, like Loom, and later
// trims replace it there — nothing is lost if the tab is closed.
export function useLibrarySave(recording: FinishedRecording | null): LibrarySave | null {
  const takesRef = useRef(new Map<Blob, SavedTake>());
  const [state, setState] = useState<{ source: Blob; status: LibrarySaveStatus; title: string } | null>(
    null
  );

  // Keeps a title the user already typed while the save was running.
  const setStatus = useCallback((source: Blob, status: LibrarySaveStatus, title?: string) => {
    setState((previous) =>
      previous?.source === source
        ? { ...previous, status }
        : { source, status, title: title ?? defaultRecordingTitle(new Date()) }
    );
  }, []);

  const source = recording?.source ?? null;
  const blob = recording?.blob ?? null;
  const chapters = recording?.chapters ?? null;
  const transcriptRef = useRef<TranscriptSegment[]>([]);
  const chaptersRef = useRef<Chapter[]>([]);
  useEffect(() => {
    transcriptRef.current = recording?.transcript ?? [];
    chaptersRef.current = recording?.chapters ?? [];
  });

  useEffect(() => {
    if (!source || takesRef.current.has(source)) {
      return;
    }
    const title = defaultRecordingTitle(new Date());
    if (!isLibraryAvailable()) {
      takesRef.current.set(source, { id: Promise.resolve(null), savedBlob: source, savedChapters: [] });
      queueMicrotask(() => setStatus(source, "unavailable", title));
      return;
    }
    const firstChapters = chaptersRef.current;
    const id = addRecording({
      title,
      video: source,
      transcript: transcriptRef.current,
      chapters: firstChapters,
    }).then(
      (saved) => {
        setStatus(source, "saved", title);
        return saved.id;
      },
      (cause: unknown) => {
        setStatus(source, isQuotaError(cause) ? "full" : "failed", title);
        return null;
      }
    );
    takesRef.current.set(source, { id, savedBlob: source, savedChapters: firstChapters });
  }, [source, setStatus]);

  useEffect(() => {
    const take = source ? takesRef.current.get(source) : undefined;
    if (!source || !blob || !take) {
      return;
    }
    take.id = take.id.then(async (id) => {
      if (!id || take.savedBlob === blob) {
        return id;
      }
      try {
        await replaceRecordingVideo(id, blob, transcriptRef.current, chaptersRef.current);
        take.savedBlob = blob;
        take.savedChapters = chaptersRef.current;
      } catch (cause) {
        setStatus(source, isQuotaError(cause) ? "full" : "failed");
      }
      return id;
    });
  }, [source, blob, setStatus]);

  // Chapter edits after recording.
  useEffect(() => {
    const take = source ? takesRef.current.get(source) : undefined;
    if (!take || !chapters) {
      return;
    }
    take.id = take.id.then(async (id) => {
      if (id && take.savedChapters !== chapters) {
        await updateRecording(id, { chapters }).catch(() => {});
        take.savedChapters = chapters;
      }
      return id;
    });
  }, [source, chapters]);

  const getId = useCallback(
    () => (source ? (takesRef.current.get(source)?.id ?? Promise.resolve(null)) : Promise.resolve(null)),
    [source]
  );

  const rename = useCallback(
    (title: string) => {
      const take = source ? takesRef.current.get(source) : undefined;
      if (!source || !take || !title.trim()) {
        return;
      }
      // May run before the first save finishes; the save keeps this title.
      setState((previous) => ({
        source,
        status: previous?.source === source ? previous.status : "saving",
        title: title.trim(),
      }));
      void take.id.then((id) => (id ? renameRecording(id, title) : undefined)).catch(() => {});
    },
    [source]
  );

  const remove = useCallback(async () => {
    const take = source ? takesRef.current.get(source) : undefined;
    const id = await take?.id;
    if (id) {
      await deleteRecordings([id]);
    }
  }, [source]);

  if (!source) {
    return null;
  }
  const current = state?.source === source ? state : null;
  return {
    status: current?.status ?? "saving",
    title: current?.title ?? defaultRecordingTitle(new Date()),
    id: getId,
    rename,
    remove,
  };
}
