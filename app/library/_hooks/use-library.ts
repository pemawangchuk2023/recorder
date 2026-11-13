import { useEffect, useState } from "react";
import { listFolders, listRecordings, subscribeToLibrary } from "@/lib/library/library";
import { isLibraryAvailable } from "@/lib/library/recordings-db";
import type { LibraryFolder, LibraryRecording } from "@/lib/library/types";

export type LibraryState =
  | { status: "loading" }
  | { status: "ready"; recordings: LibraryRecording[]; folders: LibraryFolder[] }
  | { status: "error"; message: string };

// Every recording and folder in this browser, recordings newest first; kept
// up to date as they are added, renamed, moved or deleted here or in another tab.
export function useLibrary(): LibraryState {
  const [state, setState] = useState<LibraryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!isLibraryAvailable()) {
        setState({ status: "error", message: "This browser can't store recordings." });
        return;
      }
      Promise.all([listRecordings(), listFolders()])
        .then(([recordings, folders]) => {
          if (!cancelled) {
            setState({ status: "ready", recordings, folders });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({
              status: "error",
              message: "Your library couldn't be opened. Private windows and some privacy settings block browser storage.",
            });
          }
        });
    };
    queueMicrotask(load);
    const unsubscribe = subscribeToLibrary(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return state;
}
