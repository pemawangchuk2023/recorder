"use client";

import type { RecorderStatus } from "@/app/recorder/_lib/types";

interface RecorderControlsProps {
  status: RecorderStatus;
  isCountingDown: boolean;
  disabled: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const button =
  "rounded-full px-6 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";
const secondary = `${button} bg-white text-zinc-900 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800`;

export function RecorderControls({
  status,
  isCountingDown,
  disabled,
  onStart,
  onPause,
  onResume,
  onStop,
}: RecorderControlsProps) {
  // status stays "idle" during the countdown, so it's checked separately.
  const canStart = !isCountingDown && (status === "idle" || status === "stopped");
  const canStop = isCountingDown || status === "recording" || status === "paused";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
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
          disabled={disabled || status !== "recording"}
          className={secondary}
        >
          Pause
        </button>
        <button
          type="button"
          onClick={onResume}
          disabled={disabled || status !== "paused"}
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
          Stop
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
