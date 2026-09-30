"use client";

import { HardDrive, ShieldCheck } from "lucide-react";
import type { StorageInfo } from "@/lib/library/library";
import { formatBytes } from "@/lib/format-bytes";

// How much room is left for recordings in this browser.
export function StorageMeter({
  info,
  librarySize,
  onMakePersistent,
}: {
  info: StorageInfo | null;
  // Bytes of video in the library.
  librarySize: number;
  onMakePersistent: () => void;
}) {
  const share = info && info.quota > 0 ? Math.min(1, info.used / info.quota) : 0;
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-2 font-semibold">
          <HardDrive className="size-4 text-muted-foreground" aria-hidden="true" />
          {formatBytes(librarySize)} of recordings
        </span>
        {info && info.quota > 0 && (
          <span className="text-muted-foreground">{formatBytes(Math.max(0, info.quota - info.used))} free for this site</span>
        )}
      </div>
      {info && info.quota > 0 && (
        <div
          role="meter"
          aria-label="Browser storage used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={share > 0.9 ? "h-full rounded-full bg-red-500" : "h-full rounded-full bg-brand"}
            style={{ width: `${Math.max(1, share * 100)}%` }}
          />
        </div>
      )}
      {info && !info.persisted && (
        <p className="text-sm text-muted-foreground">
          The browser may clear stored recordings if your disk runs low.{" "}
          <button
            type="button"
            onClick={onMakePersistent}
            className="font-semibold text-foreground underline underline-offset-2 hover:no-underline"
          >
            Keep them safe
          </button>
        </p>
      )}
      {info?.persisted && (
        <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Protected: the browser won&apos;t clear your recordings to free space.
        </p>
      )}
    </div>
  );
}
