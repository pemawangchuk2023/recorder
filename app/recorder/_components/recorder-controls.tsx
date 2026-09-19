"use client";

import type { RecorderStatus } from "@/app/recorder/_lib/types";
import { CONFIRM_TEXT } from "@/constants/recorder";

interface RecorderControlsProps {
  status: RecorderStatus;
  isCountingDown: boolean;
  isFinishing: boolean;
  disabled: boolean;
  onStart: () => void;
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

const button =
  "rounded-full px-6 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const secondary = `${button} bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800`;
const quiet = `${button} hover:bg-zinc-100 dark:hover:bg-zinc-900`;

export function RecorderControls({
  status,
  isCountingDown,
  isFinishing,
  disabled,
  onStart,
  onPause,
  onResume,
  onStop,
  onRestart,
  onDiscard,
  confirming,
  onConfirm,
  onCancelConfirm,
}: RecorderControlsProps) {
  // status stays "idle" during the countdown, so it's checked separately.
  const canStart = !isCountingDown && (status === "idle" || status === "stopped");
  const isActive = !isFinishing && (status === "recording" || status === "paused");
  const canStop = !isFinishing && (isCountingDown || isActive);

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-labelledby="confirm-question"
        className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <p id="confirm-question" className="text-base font-medium">
          {CONFIRM_TEXT[confirming].question}
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onCancelConfirm} className={secondary} autoFocus>
            Keep recording
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${button} bg-red-600 text-white hover:bg-red-500`}
          >
            {CONFIRM_TEXT[confirming].action}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          disabled={disabled || !canStart}
          className={`${button} bg-red-600 text-white hover:bg-red-500`}
        >
          Start recording
        </button>
        <button
          type="button"
          onClick={onPause}
          disabled={disabled || !isActive || status !== "recording"}
          className={secondary}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={onResume}
          disabled={disabled || !isActive || status !== "paused"}
          className={secondary}
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={disabled || !canStop}
          className={secondary}
        >
          {isFinishing ? "Finishing…" : "Stop"}
        </button>
        <span className="mx-1 hidden h-8 w-px bg-zinc-200 sm:block dark:bg-zinc-800" aria-hidden="true" />
        <button
          type="button"
          onClick={onRestart}
          disabled={disabled || !isActive}
          className={`${quiet} text-zinc-700 dark:text-zinc-300`}
        >
          Restart
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={disabled || !canStop}
          className={`${quiet} text-red-700 dark:text-red-400`}
        >
          Discard
        </button>
      </div>
      <p className="text-base text-zinc-500 dark:text-zinc-400">
        Shortcuts: <kbd className="font-mono">Ctrl+Shift+P</kbd> pause/resume ·{" "}
        <kbd className="font-mono">Ctrl+Shift+R</kbd> start/stop (some browsers
        reserve this one for reload).
      </p>
    </div>
  );
}
