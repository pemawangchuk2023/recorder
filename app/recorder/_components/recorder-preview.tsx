"use client";

import { useEffect, useRef } from "react";
import type { RecorderStatus } from "@/app/recorder/_lib/types";

interface RecorderPreviewProps {
  status: RecorderStatus;
  previewStream: MediaStream | null;
  countdownValue: number | null;
  elapsedSeconds: number;
  playbackUrl: string | null;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function RecorderPreview({
  status,
  previewStream,
  countdownValue,
  elapsedSeconds,
  playbackUrl,
}: RecorderPreviewProps) {
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = liveVideoRef.current;
    if (!video) {
      return;
    }
    video.srcObject = previewStream;
    if (previewStream) {
      video.play().catch(() => {});
    }
  }, [previewStream]);

  const showPlayback = status === "stopped" && playbackUrl !== null;
  const showLive = previewStream !== null && !showPlayback;
  const isActive = status === "recording" || status === "paused";

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-sm ring-1 ring-zinc-900/5 dark:ring-white/10">
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
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-zinc-400">
          <span className="h-3 w-3 rounded-full bg-red-500" aria-hidden="true" />
          <p className="text-sm">Your live preview appears here once you start.</p>
        </div>
      )}

      {showLive && isActive && (
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-sm font-medium text-white">
          <span
            className={`h-2.5 w-2.5 rounded-full bg-red-500 ${status === "recording" ? "animate-pulse" : ""}`}
            aria-hidden="true"
          />
          <span>{status === "paused" ? "Paused" : "Recording"}</span>
          <span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
        </div>
      )}

      {countdownValue !== null && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <span className="text-8xl font-bold text-white">{countdownValue}</span>
        </div>
      )}
    </div>
  );
}
