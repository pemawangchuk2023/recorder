"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { Annotation, TimeRange } from "@/app/edit/_lib/edit-plan";
import type { Envelope } from "@/app/edit/_lib/silence";
import { formatPreciseTime } from "@/app/recorder/_lib/format-time";
import type { Chapter } from "@/app/recorder/_lib/types";

interface TimelineProps {
  duration: number;
  time: number;
  cuts: TimeRange[];
  selection: TimeRange | null;
  annotations: Annotation[];
  selectedAnnotationId: string | null;
  chapters: Chapter[];
  // Null while the sound is still being read, or when there is none.
  envelope: Envelope | null;
  onSeek: (time: number) => void;
  onSelectionChange: (selection: TimeRange | null) => void;
  onSelectAnnotation: (id: string) => void;
}

// A drag shorter than this many pixels is a click (seek), not a selection.
const DRAG_THRESHOLD = 5;

function percent(time: number, duration: number): string {
  return `${Math.min(100, Math.max(0, (time / duration) * 100))}%`;
}

// The whole recording as a strip: the sound's shape, what's cut (striped),
// the current selection (blue) and when each annotation shows.
export function Timeline({
  duration,
  time,
  cuts,
  selection,
  annotations,
  selectedAnnotationId,
  chapters,
  envelope,
  onSeek,
  onSelectionChange,
  onSelectAnnotation,
}: TimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = waveRef.current;
    const track = trackRef.current;
    if (!canvas || !track) {
      return;
    }
    const draw = () => {
      const scale = Math.min(2, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(track.clientWidth * scale));
      const height = Math.max(1, Math.round(track.clientHeight * scale));
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx || !envelope || envelope.levels.length === 0) {
        return;
      }
      let peak = 0;
      for (const level of envelope.levels) {
        peak = Math.max(peak, level);
      }
      if (peak <= 0) {
        return;
      }
      ctx.fillStyle = getComputedStyle(track).color;
      const perColumn = envelope.levels.length / width;
      for (let column = 0; column < width; column++) {
        const from = Math.floor(column * perColumn);
        const to = Math.max(from + 1, Math.floor((column + 1) * perColumn));
        let loudest = 0;
        for (let index = from; index < to && index < envelope.levels.length; index++) {
          loudest = Math.max(loudest, envelope.levels[index]);
        }
        const bar = Math.max(scale, (loudest / peak) * height * 0.9);
        ctx.fillRect(column, (height - bar) / 2, 1, bar);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(track);
    return () => observer.disconnect();
  }, [envelope]);

  const timeAt = (clientX: number): number => {
    const bounds = trackRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0) {
      return 0;
    }
    return Math.min(duration, Math.max(0, ((clientX - bounds.left) / bounds.width) * duration));
  };

  // Drag across the strip to select; click to move the playhead. `anchor`
  // is the fixed end when one edge of an existing selection is dragged.
  const startDrag = (event: ReactPointerEvent<HTMLElement>, anchor: number | null) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const from = anchor ?? timeAt(startX);
    let dragged = anchor !== null;

    const move = (moveEvent: PointerEvent) => {
      if (!dragged && Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD) {
        return;
      }
      dragged = true;
      const to = timeAt(moveEvent.clientX);
      onSelectionChange({ start: Math.min(from, to), end: Math.max(from, to) });
      onSeek(to);
    };
    const end = (endEvent: PointerEvent) => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      if (!dragged) {
        onSeek(timeAt(endEvent.clientX));
      }
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 5 : 1;
    if (event.key === "ArrowLeft") {
      onSeek(Math.max(0, time - step));
    } else if (event.key === "ArrowRight") {
      onSeek(Math.min(duration, time + step));
    } else if (event.key === "Home") {
      onSeek(0);
    } else if (event.key === "End") {
      onSeek(duration);
    } else {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Playhead"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 10) / 10}
        aria-valuenow={Math.round(time * 10) / 10}
        aria-valuetext={formatPreciseTime(time)}
        onPointerDown={(event) => startDrag(event, null)}
        onKeyDown={handleKeyDown}
        className="relative h-20 cursor-text touch-none overflow-hidden rounded-xl bg-muted text-zinc-400 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-500"
      >
        <canvas ref={waveRef} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full" />

        {cuts.map((cut) => (
          <div
            key={`${cut.start}-${cut.end}`}
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 border-x border-red-500/70 bg-red-500/25"
            style={{
              left: percent(cut.start, duration),
              width: percent(cut.end - cut.start, duration),
              backgroundImage:
                "repeating-linear-gradient(135deg, transparent 0 6px, rgba(239, 68, 68, 0.35) 6px 12px)",
            }}
          />
        ))}

        {chapters.map((chapter) => (
          <div
            key={`${chapter.time}-${chapter.title}`}
            title={chapter.title}
            className="pointer-events-none absolute top-0 h-2.5 w-0.5 bg-amber-500"
            style={{ left: percent(chapter.time, duration) }}
          />
        ))}

        {annotations.map((annotation) => (
          <button
            key={annotation.id}
            type="button"
            tabIndex={-1}
            aria-label={`Select annotation at ${formatPreciseTime(annotation.start)}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => {
              onSelectAnnotation(annotation.id);
              onSeek(annotation.start);
            }}
            className={`absolute bottom-1 h-2 min-w-1.5 cursor-pointer rounded-full ${
              annotation.id === selectedAnnotationId ? "bg-sky-500 ring-2 ring-sky-300" : "bg-sky-500/70 hover:bg-sky-500"
            }`}
            style={{
              left: percent(annotation.start, duration),
              width: percent(annotation.end - annotation.start, duration),
            }}
          />
        ))}

        {selection && (
          <div
            className="pointer-events-none absolute inset-y-0 bg-sky-500/25 ring-1 ring-sky-500"
            style={{
              left: percent(selection.start, duration),
              width: percent(selection.end - selection.start, duration),
            }}
          >
            <span
              aria-hidden="true"
              onPointerDown={(event) => startDrag(event, selection.end)}
              className="pointer-events-auto absolute inset-y-0 -left-1.5 w-3 cursor-ew-resize touch-none rounded-sm bg-sky-500"
            />
            <span
              aria-hidden="true"
              onPointerDown={(event) => startDrag(event, selection.start)}
              className="pointer-events-auto absolute inset-y-0 -right-1.5 w-3 cursor-ew-resize touch-none rounded-sm bg-sky-500"
            />
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
          style={{ left: percent(time, duration) }}
        >
          <span className="absolute -top-0.5 left-1/2 size-2.5 -translate-x-1/2 rounded-full bg-foreground" />
        </div>
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>0:00.0</span>
        <span>Drag to select a part · click to move the playhead</span>
        <span>{formatPreciseTime(duration)}</span>
      </div>
    </div>
  );
}
