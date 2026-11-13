"use client";

import { HardDrive, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AUDIO_BITRATE, fallbackVideoBitrate } from "@/app/recorder/_lib/recording-format";
import type { FrameRate, Resolution, VideoQuality } from "@/app/recorder/_lib/types";
import { formatBytes } from "@/lib/format-bytes";
import {
  LOW_SPACE_SECONDS,
  estimatedBytesPerSecond,
  formatRoughDuration,
  recordableSeconds,
  shouldStopForSpace,
  type StorageReading,
} from "@/lib/takes/storage-budget";

const POLL_MS = 4000;

async function readStorage(): Promise<StorageReading | null> {
  if (!navigator.storage?.estimate) {
    return null;
  }
  const { quota = 0, usage = 0 } = await navigator.storage.estimate();
  return quota > 0 ? { quota, usage } : null;
}

interface StorageStatusProps {
  resolution: Resolution;
  frameRate: FrameRate;
  quality: VideoQuality;
  // A take is being recorded (or is paused).
  isRecording: boolean;
  // Called once when the take must stop to still fit in the library.
  onLowSpace: () => void;
}

// Says how much recording fits before starting, and stops a take cleanly
// before the browser's storage runs out — a full disk mid-recording would
// otherwise cost the whole take.
export function StorageStatus({ resolution, frameRate, quality, isRecording, onLowSpace }: StorageStatusProps) {
  const [reading, setReading] = useState<StorageReading | null>(null);
  const [stoppedForSpace, setStoppedForSpace] = useState(false);
  const usageAtStartRef = useRef<number | null>(null);
  const onLowSpaceRef = useRef(onLowSpace);
  useEffect(() => {
    onLowSpaceRef.current = onLowSpace;
  });

  const bytesPerSecond = estimatedBytesPerSecond(
    fallbackVideoBitrate(resolution, frameRate, quality),
    AUDIO_BITRATE
  );

  useEffect(() => {
    let cancelled = false;
    let stopped = false;
    if (!isRecording) {
      usageAtStartRef.current = null;
    }
    const check = async () => {
      const next = await readStorage().catch(() => null);
      if (cancelled || !next) {
        return;
      }
      setReading(next);
      if (!isRecording) {
        return;
      }
      usageAtStartRef.current ??= next.usage;
      if (!stopped && shouldStopForSpace(next, usageAtStartRef.current, bytesPerSecond)) {
        stopped = true;
        setStoppedForSpace(true);
        onLowSpaceRef.current();
      }
    };
    void check();
    // While idle the number only changes when recordings are added or
    // removed, which a slow poll catches (another tab may do either).
    const timer = setInterval(() => void check(), isRecording ? POLL_MS : POLL_MS * 5);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isRecording, bytesPerSecond]);

  if (stoppedForSpace && !isRecording) {
    return (
      <p
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-base text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
      >
        <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <span>
          The recording was stopped because this browser&apos;s storage is nearly full — everything
          up to that point was kept. Download it, then free up space in the{" "}
          <a href="/library" className="font-semibold underline underline-offset-2 hover:no-underline">
            library
          </a>{" "}
          before recording again.{" "}
          <button
            type="button"
            onClick={() => setStoppedForSpace(false)}
            className="font-semibold underline underline-offset-2 hover:no-underline"
          >
            Dismiss
          </button>
        </span>
      </p>
    );
  }
  if (!reading) {
    return null;
  }

  const free = Math.max(0, reading.quota - reading.usage);
  const seconds = recordableSeconds(reading, bytesPerSecond);
  const low = seconds < LOW_SPACE_SECONDS;
  return (
    <p
      className={
        low
          ? "flex items-start gap-2 text-sm font-medium text-amber-700 dark:text-amber-400"
          : "flex items-start gap-2 text-sm text-muted-foreground"
      }
    >
      {low ? (
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      ) : (
        <HardDrive className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      )}
      <span>
        {formatBytes(free)} free in this browser — room for {formatRoughDuration(seconds)} at these settings
        {isRecording ? "" : " (an estimate: busy screens use more)"}.
        {low && (
          <>
            {" "}
            Free up space in the{" "}
            <a href="/library" className="underline underline-offset-2 hover:no-underline">
              library
            </a>
            , or lower the resolution or detail. The recording stops by itself before space runs out.
          </>
        )}
      </span>
    </p>
  );
}
