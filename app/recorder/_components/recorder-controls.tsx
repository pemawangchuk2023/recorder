"use client";

import { Loader2, Pause, Play, RotateCcw, Square, Trash2, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { MicLevelMeter } from "@/app/recorder/_components/mic-level-meter";
import { formatTime } from "@/app/recorder/_lib/format-time";
import type { RecorderStatus } from "@/app/recorder/_lib/types";
import { CONFIRM_TEXT } from "@/constants/recorder";
import { cn } from "@/lib/utils";

interface RecorderControlsProps {
  status: RecorderStatus;
  isCountingDown: boolean;
  countdownValue: number | null;
  isFinishing: boolean;
  disabled: boolean;
  elapsedSeconds: number;
  // 0–1, or null when no microphone is recording.
  micLevel: number | null;
  onStart: () => void;
  onSkipCountdown: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
  onDiscard: () => void;
  // Set while asking to confirm Restart or Discard; the recording is paused meanwhile.
  confirming: "restart" | "discard" | null;
  onConfirm: () => void;
  onCancelConfirm: () => void;
}

const pill =
  "inline-flex items-center justify-center gap-2 rounded-full text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const primary = `${pill} bg-red-600 px-6 py-3 text-white shadow-sm shadow-red-600/30 hover:bg-red-500`;
const secondary = `${pill} bg-background px-5 py-3 ring-1 ring-border hover:bg-muted`;
const iconButton = `${pill} size-12 ring-1 ring-border hover:bg-muted`;

function Bar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-3xl border bg-card p-3 shadow-sm sm:p-4",
        className
      )}
    />
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-b-2 bg-muted px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
      {children}
    </kbd>
  );
}

export function RecorderControls({
  status,
  isCountingDown,
  countdownValue,
  isFinishing,
  disabled,
  elapsedSeconds,
  micLevel,
  onStart,
  onSkipCountdown,
  onPause,
  onResume,
  onStop,
  onRestart,
  onDiscard,
  confirming,
  onConfirm,
  onCancelConfirm,
}: RecorderControlsProps) {
  const isActive = status === "recording" || status === "paused";

  if (confirming) {
    return (
      <Bar role="alertdialog" aria-labelledby="confirm-question" className="justify-between">
        <p id="confirm-question" className="px-2 text-base font-medium">
          {CONFIRM_TEXT[confirming].question}
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onCancelConfirm} className={secondary} autoFocus>
            Keep recording
          </button>
          <button type="button" onClick={onConfirm} className={primary}>
            {CONFIRM_TEXT[confirming].action}
          </button>
        </div>
      </Bar>
    );
  }

  if (isFinishing) {
    return (
      <Bar>
        <Loader2 className="ml-2 size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <p role="status" className="text-base font-medium">
          Finishing your video…
        </p>
      </Bar>
    );
  }

  if (isCountingDown) {
    return (
      <Bar className="justify-between">
        <p role="status" className="px-2 text-base font-medium">
          Starting in <span className="tabular-nums">{countdownValue}</span>… get ready.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onStop} className={secondary}>
            <X className="size-4" aria-hidden="true" />
            Cancel
          </button>
          <button type="button" onClick={onSkipCountdown} className={primary}>
            Start now
          </button>
        </div>
      </Bar>
    );
  }

  if (isActive) {
    const paused = status === "paused";
    return (
      <Bar>
        <div className="flex items-center gap-2.5 rounded-full bg-muted px-4 py-3" role="timer" aria-live="off">
          <span
            className={cn("size-2.5 rounded-full", paused ? "bg-amber-500" : "animate-pulse bg-red-500")}
            aria-hidden="true"
          />
          <span className="text-base font-semibold tabular-nums">{formatTime(elapsedSeconds)}</span>
          <span className="sr-only">{paused ? "Paused" : "Recording"}</span>
        </div>
        {micLevel !== null && <MicLevelMeter level={micLevel} className="hidden sm:flex" />}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRestart}
            disabled={disabled}
            className={iconButton}
            aria-label="Restart"
            title="Restart"
          >
            <RotateCcw className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={disabled}
            className={cn(iconButton, "text-red-600 dark:text-red-400")}
            aria-label="Discard"
            title="Discard"
          >
            <Trash2 className="size-5" aria-hidden="true" />
          </button>
          <button type="button" onClick={paused ? onResume : onPause} disabled={disabled} className={secondary}>
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
            {paused ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={onStop} disabled={disabled} className={primary}>
            <Square className="size-4 fill-current" aria-hidden="true" />
            Stop
          </button>
        </div>
      </Bar>
    );
  }

  return (
    <Bar className="justify-between">
      <button type="button" onClick={onStart} disabled={disabled} className={cn(primary, "px-7 text-lg")}>
        <span className="size-3.5 rounded-full bg-white" aria-hidden="true" />
        {status === "stopped" ? "Record another" : "Start recording"}
      </button>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>R</Kbd> start/stop
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>P</Kbd> pause
        </span>
      </p>
    </Bar>
  );
}
