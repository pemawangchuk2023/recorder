"use client";

import { Search } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import { formatTime } from "@/app/recorder/_lib/format-time";
import { downloadFile } from "@/app/recorder/_lib/save-recording";
import { toPlainText, toSrt } from "@/app/recorder/_lib/transcript";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";
import { cn } from "@/lib/utils";

interface TranscriptPanelProps {
  segments: TranscriptSegment[];
  // Filename without extension, shared with the video.
  baseName: string;
  playbackRef: RefObject<HTMLVideoElement | null>;
  defaultOpen?: boolean;
}

// A search box only helps once there's more than a screenful.
const SEARCH_MIN_LINES = 6;

const smallButton =
  "rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted";

// The player's current time, following it as it plays or seeks. Media events
// don't bubble, but they can be caught on the way down, so this works even
// when the player mounts after this panel.
function usePlaybackTime(playbackRef: RefObject<HTMLVideoElement | null>): number {
  const [time, setTime] = useState(0);
  useEffect(() => {
    const handle = (event: Event) => {
      if (event.target === playbackRef.current && playbackRef.current) {
        setTime(playbackRef.current.currentTime);
      }
    };
    document.addEventListener("timeupdate", handle, true);
    document.addEventListener("seeked", handle, true);
    return () => {
      document.removeEventListener("timeupdate", handle, true);
      document.removeEventListener("seeked", handle, true);
    };
  }, [playbackRef]);
  return time;
}

export function TranscriptPanel({ segments, baseName, playbackRef, defaultOpen }: TranscriptPanelProps) {
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("");
  const time = usePlaybackTime(playbackRef);

  const needle = query.trim().toLowerCase();
  const shown = needle ? segments.filter((segment) => segment.text.toLowerCase().includes(needle)) : segments;

  const seek = (seconds: number) => {
    const video = playbackRef.current;
    if (video) {
      video.currentTime = seconds;
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
    <details className="group flex flex-col" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
        <span>
          Transcript{" "}
          <span className="font-normal text-muted-foreground">
            · {segments.length} {segments.length === 1 ? "line" : "lines"}
          </span>
        </span>
        <span className="text-muted-foreground transition-transform group-open:rotate-90" aria-hidden="true">
          ›
        </span>
      </summary>

      {segments.length >= SEARCH_MIN_LINES && (
        <label className="relative mt-4 block">
          <span className="sr-only">Search the transcript</span>
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search the transcript"
            className="w-full rounded-xl border border-input bg-background py-2 pr-3 pl-9 text-sm"
          />
        </label>
      )}

      <ol className="mt-4 flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
        {shown.map((segment) => {
          const active = time >= segment.start && time < segment.end;
          return (
            <li key={`${segment.start}-${segment.text}`}>
              <button
                type="button"
                onClick={() => seek(segment.start)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex w-full gap-3 rounded-lg px-2 py-1.5 text-left text-base leading-relaxed transition-colors hover:bg-muted",
                  active && "bg-brand/10"
                )}
              >
                <span className="shrink-0 font-semibold tabular-nums text-brand">
                  {formatTime(Math.floor(segment.start))}
                </span>
                <span>{segment.text}</span>
              </button>
            </li>
          );
        })}
        {shown.length === 0 && <li className="px-2 text-sm text-muted-foreground">No lines match “{query}”.</li>}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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
