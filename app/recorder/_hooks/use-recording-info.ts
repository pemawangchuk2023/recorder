import { useEffect, useState } from "react";
import { readRecordingInfo, type RecordingInfo } from "@/app/recorder/_lib/edit-recording";

// Duration and codec of a finished recording; null until read (or if unreadable).
export function useRecordingInfo(blob: Blob): RecordingInfo | null {
  const [result, setResult] = useState<{ blob: Blob; info: RecordingInfo } | null>(null);

  useEffect(() => {
    let cancelled = false;
    readRecordingInfo(blob)
      .then((info) => {
        if (!cancelled) {
          setResult({ blob, info });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [blob]);

  return result?.blob === blob ? result.info : null;
}
