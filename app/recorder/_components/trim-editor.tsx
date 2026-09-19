"use client";

import { useState, type RefObject } from "react";
import { trimRecording } from "@/app/recorder/_lib/edit-recording";
import { formatPreciseTime } from "@/app/recorder/_lib/format-time";
import { trimTranscript } from "@/app/recorder/_lib/transcript";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";

interface TrimEditorProps {
  blob: Blob;
  duration: number;
  transcript: TranscriptSegment[];
  playbackRef: RefObject<HTMLVideoElement | null>;
  onTrimmed: (blob: Blob, transcript: TranscriptSegment[]) => void;
}

const MIN_CLIP_SECONDS = 1;
// Trim points this close to the ends count as "not trimmed".
const EDGE_SECONDS = 0.05;

const smallButton =
  "rounded-full px-4 py-2 text-base font-medium ring-1 ring-zinc-300 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-zinc-700 dark:hover:bg-zinc-800";

function TrimPoint({
  label,
  value,
  max,
  disabled,
  onChange,
  onUsePlayhead,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onUsePlayhead: () => void;
}) {
  const id = `trim-${label.toLowerCase()}`;
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 gap-y-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_4.5rem_auto]">
      <label htmlFor={id} className="text-base font-medium">
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={value}
        disabled={disabled}
        aria-valuetext={formatPreciseTime(value)}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-emerald-600"
      />
      <span className="text-right text-base tabular-nums text-zinc-700 dark:text-zinc-300">
        {formatPreciseTime(value)}
      </span>
      <button
        type="button"
        onClick={onUsePlayhead}
        disabled={disabled}
        className={`${smallButton} col-span-3 justify-self-start sm:col-span-1`}
      >
        Use playhead
      </button>
    </div>
  );
}

export function TrimEditor({ blob, duration, transcript, playbackRef, onTrimmed }: TrimEditorProps) {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(duration);
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  const isApplying = progress !== null;
  const trimsStart = start > EDGE_SECONDS;
  const trimsEnd = end < duration - EDGE_SECONDS;

  // Show the frame at the trim point while dragging.
  const preview = (time: number) => {
    const video = playbackRef.current;
    if (video) {
      video.pause();
      video.currentTime = time;
    }
  };
  const changeStart = (value: number) => {
    const next = Math.min(Math.max(0, value), end - MIN_CLIP_SECONDS);
    setStart(next);
    preview(next);
  };
  const changeEnd = (value: number) => {
    const next = Math.max(Math.min(duration, value), start + MIN_CLIP_SECONDS);
    setEnd(next);
    preview(next);
  };
  const playhead = () => playbackRef.current?.currentTime ?? 0;

  const apply = async () => {
    const from = trimsStart ? start : 0;
    const to = trimsEnd ? end : duration;
    setFailed(false);
    setProgress(0);
    try {
      const trimmed = await trimRecording(blob, from, to, setProgress);
      onTrimmed(trimmed, trimTranscript(transcript, from, to));
    } catch {
      setFailed(true);
      setProgress(null);
    }
  };

  return (
    <section className="flex flex-col gap-4" aria-labelledby="trim-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="trim-heading" className="text-lg font-semibold">
          Trim
        </h3>
        <p className="text-base tabular-nums text-zinc-600 dark:text-zinc-400">
          Keeping {formatPreciseTime(end - start)} of {formatPreciseTime(duration)}
        </p>
      </div>

      <div className="relative h-3 rounded-full bg-zinc-200 dark:bg-zinc-800" aria-hidden="true">
        <div
          className="absolute inset-y-0 rounded-full bg-emerald-500"
          style={{
            left: `${(start / duration) * 100}%`,
            right: `${100 - (end / duration) * 100}%`,
          }}
        />
      </div>

      <TrimPoint
        label="Start"
        value={start}
        max={duration}
        disabled={isApplying}
        onChange={changeStart}
        onUsePlayhead={() => changeStart(playhead())}
      />
      <TrimPoint
        label="End"
        value={end}
        max={duration}
        disabled={isApplying}
        onChange={changeEnd}
        onUsePlayhead={() => changeEnd(playhead())}
      />

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={apply}
          disabled={isApplying || !(trimsStart || trimsEnd)}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Apply trim
        </button>
        {progress !== null && (
          <span className="text-base tabular-nums text-zinc-600 dark:text-zinc-400" role="status">
            Trimming… {Math.round(progress * 100)}%
          </span>
        )}
        {failed && (
          <span className="text-base text-red-700 dark:text-red-400" role="alert">
            Trimming didn&apos;t work. Your recording is unchanged — try again or save it as is.
          </span>
        )}
      </div>
      {trimsStart && !isApplying && (
        <p className="text-base text-zinc-500 dark:text-zinc-400">
          Cutting the start re-encodes the video, which takes a little while for long recordings.
        </p>
      )}
    </section>
  );
}
