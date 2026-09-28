"use client";

import { formatPreciseTime } from "@/app/recorder/_lib/format-time";
import type { TrimRange as Range } from "@/app/convert/_lib/types";

const MIN_CLIP_SECONDS = 0.5;

function Slider({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center gap-3 text-base">
      <span className="font-medium">{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={value}
        aria-valuetext={formatPreciseTime(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-red-600"
      />
      <span className="text-right tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatPreciseTime(value)}
      </span>
    </label>
  );
}

export function TrimRange({
  duration,
  value,
  onChange,
}: {
  duration: number;
  value: Range | null;
  onChange: (value: Range | null) => void;
}) {
  const { start, end } = value ?? { start: 0, end: duration };
  return (
    <div className="flex flex-col gap-3">
      <Slider
        label="Start"
        value={start}
        max={duration}
        onChange={(next) => onChange({ start: Math.min(next, end - MIN_CLIP_SECONDS), end })}
      />
      <Slider
        label="End"
        value={end}
        max={duration}
        onChange={(next) => onChange({ start, end: Math.max(next, start + MIN_CLIP_SECONDS) })}
      />
      <p className="text-base text-muted-foreground">
        Keeps {formatPreciseTime(end - start)} of {formatPreciseTime(duration)}.
        {value && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => onChange(null)}
              className="font-medium underline underline-offset-2 hover:no-underline"
            >
              Reset
            </button>
          </>
        )}
      </p>
    </div>
  );
}
