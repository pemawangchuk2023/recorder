"use client";

import { Bookmark, Check, Copy, Plus, X } from "lucide-react";
import { useState, type RefObject } from "react";
import {
  formatChapterTime,
  nextChapterTitle,
  sortChapters,
  toYouTubeChapters,
} from "@/app/recorder/_lib/chapters";
import type { Chapter } from "@/app/recorder/_lib/types";

interface ChaptersPanelProps {
  chapters: Chapter[];
  duration: number;
  playbackRef: RefObject<HTMLVideoElement | null>;
  onChange: (chapters: Chapter[]) => void;
}

const smallButton =
  "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

// Chapter markers: rename, remove or add them, then copy them as YouTube
// chapters (they're also added to the YouTube description automatically).
export function ChaptersPanel({ chapters, duration, playbackRef, onChange }: ChaptersPanelProps) {
  const [copied, setCopied] = useState(false);
  const sorted = sortChapters(chapters);
  const youtube = toYouTubeChapters(chapters, duration);

  const seek = (time: number) => {
    const video = playbackRef.current;
    if (video) {
      video.currentTime = time;
      void video.play().catch(() => {});
    }
  };

  const update = (target: Chapter, patch: Partial<Chapter> | null) => {
    onChange(
      patch === null
        ? chapters.filter((chapter) => chapter !== target)
        : chapters.map((chapter) => (chapter === target ? { ...chapter, ...patch } : chapter))
    );
    setCopied(false);
  };

  const addAtPlayhead = () => {
    const time = playbackRef.current?.currentTime ?? 0;
    onChange([...chapters, { time, title: nextChapterTitle(chapters) }]);
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(youtube.text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby="chapters-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="chapters-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Bookmark className="size-4 text-brand" aria-hidden="true" />
          Chapters
          <span className="font-normal text-muted-foreground">· {chapters.length}</span>
        </h3>
        <p className="text-sm text-muted-foreground">Drop markers while recording with Ctrl+Shift+M.</p>
      </div>

      {sorted.length > 0 ? (
        <ol className="flex flex-col gap-1.5">
          {sorted.map((chapter, index) => (
            <li key={`${chapter.time}-${index}`} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => seek(chapter.time)}
                className="w-16 shrink-0 rounded-md py-1.5 text-left text-sm font-semibold tabular-nums text-brand hover:underline"
                aria-label={`Play from ${formatChapterTime(chapter.time)}`}
              >
                {formatChapterTime(chapter.time)}
              </button>
              <input
                value={chapter.title}
                maxLength={80}
                aria-label={`Title of the chapter at ${formatChapterTime(chapter.time)}`}
                onChange={(event) => update(chapter, { title: event.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm"
              />
              <button
                type="button"
                onClick={() => update(chapter, null)}
                className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={`Remove the chapter at ${formatChapterTime(chapter.time)}`}
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">
          No chapters yet. Play to a spot and add one, so viewers can jump straight to each part.
        </p>
      )}

      {youtube.problem && <p className="text-sm text-amber-700 dark:text-amber-400">{youtube.problem}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addAtPlayhead} className={smallButton}>
          <Plus className="size-4" aria-hidden="true" />
          Add at playhead
        </button>
        <button type="button" onClick={() => void copy()} disabled={!youtube.text} className={smallButton}>
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy as YouTube chapters"}
        </button>
      </div>
    </section>
  );
}
