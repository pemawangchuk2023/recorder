"use client";

import { Camera, Gauge } from "lucide-react";
import { useState, type RefObject } from "react";
import { captureFrame } from "@/app/recorder/_lib/capture-frame";
import { formatTime } from "@/app/recorder/_lib/format-time";
import { downloadFile } from "@/app/recorder/_lib/save-recording";
import { PLAYBACK_SPEEDS } from "@/constants/recorder";
import { cn } from "@/lib/utils";

interface PlayerToolsProps {
  playbackRef: RefObject<HTMLVideoElement | null>;
  // Filename without extension, shared with the video.
  baseName: string;
}

// Speed and snapshot controls under a player, like Loom's.
export function PlayerTools({ playbackRef, baseName }: PlayerToolsProps) {
  const [speed, setSpeed] = useState<number>(1);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);

  const changeSpeed = (next: number) => {
    setSpeed(next);
    if (playbackRef.current) {
      playbackRef.current.playbackRate = next;
    }
  };

  const snapshot = async () => {
    const video = playbackRef.current;
    if (!video) {
      return;
    }
    const time = Math.floor(video.currentTime);
    const png = await captureFrame(video);
    if (!png) {
      setSnapshotMessage("Play the video first, then try again.");
      return;
    }
    const filename = `${baseName} ${formatTime(time).replace(":", "-")}.png`;
    downloadFile(png, filename);
    setSnapshotMessage(`Saved the frame at ${formatTime(time)}.`);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Playback speed" className="flex items-center gap-1 rounded-full bg-muted p-1">
        <Gauge className="mx-2 size-4 text-muted-foreground" aria-hidden="true" />
        {PLAYBACK_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={speed === value}
            onClick={() => changeSpeed(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums transition-colors",
              speed === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {value}×
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        {snapshotMessage && (
          <span role="status" className="text-sm text-muted-foreground">
            {snapshotMessage}
          </span>
        )}
        <button
          type="button"
          onClick={() => void snapshot()}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted"
        >
          <Camera className="size-4" aria-hidden="true" />
          Save frame as PNG
        </button>
      </div>
    </div>
  );
}
