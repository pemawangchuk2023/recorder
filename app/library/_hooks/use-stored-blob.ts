import { useEffect, useState } from "react";

// Loads a Blob from the library by key; null while loading or if missing.
// `version` reloads it when the stored file changes (e.g. after a trim).
export function useStoredBlob(
  key: string,
  version: number,
  load: (key: string) => Promise<Blob | null>
): { blob: Blob | null; loaded: boolean } {
  const [result, setResult] = useState<{ tag: string; blob: Blob | null } | null>(null);
  const tag = `${key}:${version}`;

  useEffect(() => {
    let cancelled = false;
    load(key)
      .then((blob) => {
        if (!cancelled) {
          setResult({ tag, blob });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ tag, blob: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key, tag, load]);

  return result?.tag === tag ? { blob: result.blob, loaded: true } : { blob: null, loaded: false };
}
