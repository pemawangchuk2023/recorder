"use client";

import { useState, type RefObject } from "react";
import { formatTime } from "@/app/recorder/_lib/format-time";
import { downloadFile } from "@/app/recorder/_lib/save-recording";
import { toPlainText, toSrt } from "@/app/recorder/_lib/transcript";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  // Filename without extension, shared with the video.
  baseName: string;
  playbackRef: RefObject<HTMLVideoElement | null>;
}

const smallButton =
  "rounded-full px-4 py-2 text-base font-medium ring-1 ring-zinc-300 transition-colors hover:bg-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-800";

export function TranscriptPanel({ segments, baseName, playbackRef }: TranscriptPanelProps) {
  const [copied, setCopied] = useState(false);

  const seek = (time: number) => {
    const video = playbackRef.current;
    if (video) {
      video.currentTime = time;
      void video.play().catch(() => {});
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainText(segments));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <details className="group flex flex-col">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
        <span>
          Transcript{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">
            · {segments.length} {segments.length === 1 ? "line" : "lines"}
          </span>
        </span>
        <span className="text-zinc-400 transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
      </summary>
      <ol className="mt-4 flex max-h-72 flex-col gap-2 overflow-y-auto pr-2">
        {segments.map((segment) => (
          <li key={`${segment.start}-${segment.text}`} className="flex gap-3 text-base leading-relaxed">
            <button
              type="button"
              onClick={() => seek(segment.start)}
              className="shrink-0 font-medium tabular-nums text-emerald-700 hover:underline dark:text-emerald-400"
              aria-label={`Play from ${formatTime(Math.floor(segment.start))}`}
            >
              {formatTime(Math.floor(segment.start))}
            </button>
            <span>{segment.text}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={copy} className={smallButton}>
          {copied ? "Copied" : "Copy text"}
        </button>
        <button
          type="button"
          onClick={() =>
            downloadFile(new Blob([toSrt(segments)], { type: "application/x-subrip" }), `${baseName}.srt`)
          }
          className={smallButton}
        >
          Download captions (.srt)
        </button>
      </div>
    </details>
  );
}
