import { useEffect, useState } from "react";

// An object URL for a blob that stays valid for as long as the component is
// mounted. The editor seeks around constantly, and every seek reads from the
// URL again, so it must not be released early (as happens when the URL is
// made during render and React re-runs effects in development).
export function useBlobUrl(blob: Blob): string | null {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    // Subscribing to an external resource (the URL registry) that only
    // exists in the browser, and releasing it on cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntry({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return entry?.blob === blob ? entry.url : null;
}
