"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "@/app/recorder/_lib/format-time";
import type { RecorderStatus } from "@/app/recorder/_lib/types";

interface RecorderPreviewProps {
  status: RecorderStatus;
  previewStream: MediaStream | null;
  // Shown before recording starts, e.g. the camera in camera-only mode.
  idleStream: MediaStream | null;
  countdownValue: number | null;
  elapsedSeconds: number;
  playbackUrl: string | null;
}

export function RecorderPreview({
  status,
  previewStream,
  idleStream,
  countdownValue,
  elapsedSeconds,
  playbackUrl,
}: RecorderPreviewProps) {
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const showPlayback = status === "stopped" && playbackUrl !== null;
  const liveStream = previewStream ?? (showPlayback ? null : idleStream);

  useEffect(() => {
    const video = liveVideoRef.current;
    if (!video) {
      return;
    }
    video.srcObject = liveStream;
    if (liveStream) {
      video.play().catch(() => {});
    }
  }, [liveStream]);

  const showLive = liveStream !== null;
  const isActive = status === "recording" || status === "paused";

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-zinc-900 shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10">
      <video
        ref={liveVideoRef}
        muted
        playsInline
        className={showLive ? "h-full w-full object-contain" : "hidden"}
      />

      {showPlayback && (
        <video
          src={playbackUrl}
          controls
          playsInline
          className="h-full w-full object-contain"
        />
      )}

      {!showLive && !showPlayback && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-zinc-400">
          <span className="h-4 w-4 rounded-full bg-red-500" aria-hidden="true" />
          <p className="text-lg">Your live preview appears here once you start.</p>
        </div>
      )}

      {showLive && isActive && (
        <div className="absolute left-4 top-4 flex items-center gap-2.5 rounded-full bg-black/70 px-4 py-2 text-base font-medium text-white">
          <span
            className={`h-3 w-3 rounded-full bg-red-500 ${status === "recording" ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
          <span>{status === "paused" ? "Paused" : "Recording"}</span>
          <span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
        </div>
      )}

      {countdownValue !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <span className="text-9xl font-bold text-white">{countdownValue}</span>
        </div>
      )}
    </div>
  );
}
