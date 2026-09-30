import { useEffect, useState } from "react";
import { listRecordings, subscribeToLibrary } from "@/lib/library/library";
import { isLibraryAvailable } from "@/lib/library/recordings-db";
import type { LibraryRecording } from "@/lib/library/types";

export type LibraryState =
  | { status: "loading" }
  | { status: "ready"; recordings: LibraryRecording[] }
  | { status: "error"; message: string };

// Every recording in this browser, newest first; kept up to date as
// recordings are added, renamed or deleted here or in another tab.
export function useLibrary(): LibraryState {
  const [state, setState] = useState<LibraryState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!isLibraryAvailable()) {
        setState({ status: "error", message: "This browser can't store recordings." });
        return;
      }
      listRecordings()
        .then((recordings) => {
          if (!cancelled) {
            setState({ status: "ready", recordings });
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
