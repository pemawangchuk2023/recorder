import { useCallback, useEffect, useState } from "react";
import {
  getStorageInfo,
  requestPersistentStorage,
  type StorageInfo,
} from "@/lib/library/library";

// How much of the browser's storage the library uses. `refreshKey` re-reads
// it, e.g. when the recordings change.
export function useStorageInfo(refreshKey: unknown): {
  info: StorageInfo | null;
  makePersistent: () => Promise<void>;
} {
  const [info, setInfo] = useState<StorageInfo | null>(null);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getStorageInfo()
      .then((next) => {
        if (!cancelled) {
          setInfo(next);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshKey, requests]);

  const makePersistent = useCallback(async () => {
    await requestPersistentStorage();
    setRequests((count) => count + 1);
  }, []);

  return { info, makePersistent };
}
