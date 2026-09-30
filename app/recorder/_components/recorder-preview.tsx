"use client";

import { AppWindow, CameraOff, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import { CameraBubblePreview } from "@/app/recorder/_components/camera-bubble-preview";
import { DraggableBubble } from "@/app/recorder/_components/draggable-bubble";
import { StackedPreview } from "@/app/recorder/_components/stacked-preview";
import { StreamVideo } from "@/app/recorder/_components/stream-video";
import { formatTime } from "@/app/recorder/_lib/format-time";
import type {
  BubblePosition,
  RecorderSettings,
  RecorderStatus,
  RecordingMode,
  ScreenCameraLayout,
  StackedLayout,
} from "@/app/recorder/_lib/types";
import { cn } from "@/lib/utils";

interface RecorderPreviewProps {
  status: RecorderStatus;
  // What's being recorded, once a take is set up.
  previewStream: MediaStream | null;
  mode: RecordingMode;
  // The live camera, shown before recording starts.
  cameraStream: MediaStream | null;
  camera: RecorderSettings["camera"];
  layout: ScreenCameraLayout;
  stacked: StackedLayout;
  onBubbleMove: (position: BubblePosition) => void;
  onBubbleResize: (size: number, position: BubblePosition) => void;
  // Set while the bubble is drawn into the recording, so it can be dragged there.
  bubbleFrame: { width: number; height: number } | null;
  bubbleHidden: boolean;
  countdownValue: number | null;
  onSkipCountdown: () => void;
  isFinishing: boolean;
  elapsedSeconds: number;
  playbackUrl: string | null;
  // The finished recording's player, for the trim controls.
  playbackRef: RefObject<HTMLVideoElement | null>;
}

function IdleScreen({ mode, hasCamera }: { mode: RecordingMode; hasCamera: boolean }) {
  if (mode === "camera") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-zinc-400">
        <CameraOff className="size-10" aria-hidden="true" />
        <p className="text-lg">{hasCamera ? "Starting camera…" : "Allow camera access to see yourself here."}</p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(ellipse_at_top,var(--color-zinc-800),var(--color-zinc-950))] px-6 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
        <AppWindow className="size-8 text-white" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-semibold text-white sm:text-xl">Ready when you are</p>
        <p className="max-w-md text-base text-zinc-400">
          Press Start, then pick a screen, window or tab to share. Your live preview appears here.
        </p>
      </div>
    </div>
  );
}

export function RecorderPreview({
  status,
  previewStream,
  mode,
  cameraStream,
  camera,
  layout,
  stacked,
  onBubbleMove,
  onBubbleResize,
  bubbleFrame,
  bubbleHidden,
  countdownValue,
  onSkipCountdown,
  isFinishing,
  elapsedSeconds,
  playbackUrl,
  playbackRef,
}: RecorderPreviewProps) {
  const showPlayback = status === "stopped" && playbackUrl !== null && !previewStream;
  const isActive = status === "recording" || status === "paused";
  const showIdleCamera = !previewStream && !showPlayback && mode === "camera" && cameraStream;
  const showStacked = !previewStream && !showPlayback && mode === "screen-camera" && layout === "stacked";
  const showBubble =
    !previewStream && !showPlayback && mode === "screen-camera" && layout === "bubble" && cameraStream;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-zinc-950 shadow-lg ring-1 ring-zinc-900/10 dark:ring-white/10">
      {previewStream ? (
        <StreamVideo stream={previewStream} className="size-full object-contain" />
      ) : showPlayback ? (
        <video
          ref={playbackRef}
          src={playbackUrl}
          controls
          playsInline
          className="size-full bg-black object-contain"
        />
      ) : showStacked ? (
        <StackedPreview cameraStream={cameraStream} camera={camera} layout={stacked} />
      ) : showIdleCamera ? (
        <StreamVideo
          stream={cameraStream}
          className={cn("size-full object-cover", camera.mirror && "-scale-x-100")}
        />
      ) : (
        <IdleScreen mode={mode} hasCamera={cameraStream !== null} />
      )}

      {showBubble && <CameraBubblePreview
          stream={cameraStream}
          camera={camera}
          onMove={onBubbleMove}
          onResize={onBubbleResize}
        />}

      {previewStream && bubbleFrame && !bubbleHidden && !isFinishing && (
        <DraggableBubble
          frame={bubbleFrame}
          position={camera.position}
          size={camera.size}
          shape={camera.shape}
          onMove={onBubbleMove}
          onResize={onBubbleResize}
        />
      )}

      {previewStream && isActive && (
        <div className="absolute left-4 top-4 flex items-center gap-2.5 rounded-full bg-black/70 px-4 py-2 text-base font-medium text-white backdrop-blur">
          <span
            className={cn("size-2.5 rounded-full", status === "recording" ? "animate-pulse bg-red-500" : "bg-amber-400")}
            aria-hidden="true"
          />
          <span>{status === "paused" ? "Paused" : "REC"}</span>
          <span className="tabular-nums">{formatTime(elapsedSeconds)}</span>
        </div>
      )}

      {isFinishing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70 backdrop-blur-sm">
          <Loader2 className="size-10 animate-spin text-white" aria-hidden="true" />
          <span className="text-2xl font-semibold text-white">Finishing your video…</span>
        </div>
      )}

      {countdownValue !== null && (
        // A mouse shortcut for "Start now"; the control bar has the real button.
        <button
          type="button"
          onClick={onSkipCountdown}
          tabIndex={-1}
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60 backdrop-blur-sm"
        >
          <span
            key={countdownValue}
            className="grid size-40 place-items-center rounded-full bg-white/10 text-8xl font-bold tabular-nums text-white ring-4 ring-white/20 animate-in zoom-in-50 fade-in duration-300"
          >
            {countdownValue}
          </span>
          <span className="text-base font-medium text-white/80">Click to start now</span>
        </button>
      )}
    </div>
  );
}
