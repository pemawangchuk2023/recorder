"use client";

import { Crop, Maximize, RectangleVertical } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { ScreenArea } from "@/app/recorder/_lib/types";
import { DEFAULT_SETTINGS, MIN_SCREEN_AREA } from "@/constants/recorder";
import { cn } from "@/lib/utils";

interface ScreenAreaPickerProps {
  // The shared screen, uncropped.
  stream: MediaStream;
  // Width ÷ height of the top half; an area of this shape fills it exactly.
  topAspect: number;
  area: ScreenArea;
  onChange: (area: ScreenArea) => void;
}

type Corner = "nw" | "ne" | "sw" | "se";

const CORNERS: { corner: Corner; className: string; cursor: string }[] = [
  // Inside the box's corners: at the screen's edges, outside would be clipped.
  { corner: "nw", className: "top-1 left-1", cursor: "cursor-nwse-resize" },
  { corner: "ne", className: "top-1 right-1", cursor: "cursor-nesw-resize" },
  { corner: "sw", className: "bottom-1 left-1", cursor: "cursor-nesw-resize" },
  { corner: "se", className: "right-1 bottom-1", cursor: "cursor-nwse-resize" },
];

const KEY_STEP = 0.02;

type Gesture =
  | { kind: "move"; startX: number; startY: number; start: ScreenArea }
  | { kind: "resize"; corner: Corner; start: ScreenArea };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const isWholeScreen = (area: ScreenArea) =>
  area.x === 0 && area.y === 0 && area.width === 1 && area.height === 1;

// The whole shared screen with a box on it. Whatever is inside the box —
// any shape — is shown complete at the top of the vertical video.
export function ScreenAreaPicker({ stream, topAspect, area, onChange }: ScreenAreaPickerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [aspect, setAspect] = useState(16 / 9);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.srcObject = stream;
    void video.play().catch(() => {});
    // The shared window can change size mid-recording.
    const measure = () => video.videoWidth && setAspect(video.videoWidth / video.videoHeight);
    video.addEventListener("loadedmetadata", measure);
    video.addEventListener("resize", measure);
    return () => {
      video.removeEventListener("loadedmetadata", measure);
      video.removeEventListener("resize", measure);
    };
  }, [stream]);

  // Pointer position → fractions of the screen (0–1).
  const toFraction = (event: PointerEvent) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      return null;
    }
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
      dx: 1 / rect.width,
      dy: 1 / rect.height,
    };
  };

  const begin = (event: PointerEvent<HTMLElement>, gesture: Gesture) => {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current = gesture;
    setActive(true);
  };

  const move = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    const point = gesture ? toFraction(event) : null;
    if (!gesture || !point) {
      return;
    }
    const { start } = gesture;
    if (gesture.kind === "move") {
      onChange({
        ...start,
        x: clamp(start.x + (event.clientX - gesture.startX) * point.dx, 0, 1 - start.width),
        y: clamp(start.y + (event.clientY - gesture.startY) * point.dy, 0, 1 - start.height),
      });
      return;
    }
    // The opposite corner stays put; this one follows the pointer.
    const west = gesture.corner.endsWith("w");
    const north = gesture.corner.startsWith("n");
    const fixedX = west ? start.x + start.width : start.x;
    const fixedY = north ? start.y + start.height : start.y;
    const x = west ? Math.min(point.x, fixedX - MIN_SCREEN_AREA) : Math.max(point.x, fixedX + MIN_SCREEN_AREA);
    const y = north ? Math.min(point.y, fixedY - MIN_SCREEN_AREA) : Math.max(point.y, fixedY + MIN_SCREEN_AREA);
    const left = clamp(Math.min(x, fixedX), 0, 1);
    const top = clamp(Math.min(y, fixedY), 0, 1);
    onChange({
      x: left,
      y: top,
      width: Math.min(1, Math.max(x, fixedX)) - left,
      height: Math.min(1, Math.max(y, fixedY)) - top,
    });
  };

  const end = () => {
    gestureRef.current = null;
    setActive(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const step = moves[event.key];
    if (step) {
      event.preventDefault();
      onChange({
        ...area,
        x: clamp(area.x + step[0], 0, 1 - area.width),
        y: clamp(area.y + step[1], 0, 1 - area.height),
      });
    }
  };

  // Reshapes the box, around its centre, to the top half's shape — as tall as
  // it is now, or as large as fits the screen.
  const fillTopHalf = () => {
    let height = area.height;
    let width = (height * topAspect) / aspect;
    if (width > 1) {
      width = 1;
      height = aspect / topAspect;
    }
    height = Math.min(1, height);
    const centerX = area.x + area.width / 2;
    const centerY = area.y + area.height / 2;
    onChange({
      x: clamp(centerX - width / 2, 0, 1 - width),
      y: clamp(centerY - height / 2, 0, 1 - height),
      width,
      height,
    });
  };
  const fillsTopHalf = Math.abs((area.width * aspect) / area.height - topAspect) < 0.01;

  const percent = (value: number) => `${value * 100}%`;
  const whole = isWholeScreen(area);

  return (
    <section className="flex flex-col gap-3 rounded-3xl border bg-card p-4 shadow-sm sm:p-5" aria-labelledby="area-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="area-heading" className="flex items-center gap-2 text-base font-semibold">
          <Crop className="size-4 text-brand" aria-hidden="true" />
          What shows on top
        </h3>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={fillTopHalf}
            disabled={fillsTopHalf}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <RectangleVertical className="size-3.5" aria-hidden="true" />
            Fill top half
          </button>
          <button
            type="button"
            onClick={() => onChange(DEFAULT_SETTINGS.stacked.area)}
            disabled={whole}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
          >
            <Maximize className="size-3.5" aria-hidden="true" />
            Whole screen
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div
          ref={frameRef}
          className="relative w-full overflow-hidden rounded-xl bg-black select-none"
          style={{ aspectRatio: aspect }}
        >
          <video ref={videoRef} muted playsInline className="pointer-events-none size-full object-fill" />
          <div
            role="group"
            tabIndex={0}
            aria-label="Area shown on top of the video. Drag to move it, drag a corner to resize, or use the arrow keys."
            onPointerDown={(event) => begin(event, { kind: "move", startX: event.clientX, startY: event.clientY, start: area })}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onKeyDown={handleKeyDown}
            className={cn(
              "absolute touch-none rounded-sm border-2 border-white outline-none focus-visible:ring-4 focus-visible:ring-white/70",
              "shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]",
              active ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{
              left: percent(area.x),
              top: percent(area.y),
              width: percent(area.width),
              height: percent(area.height),
            }}
          >
            <span className="absolute top-1.5 left-8 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {whole ? "Whole screen" : "Shown on top"}
            </span>
            {CORNERS.map(({ corner, className, cursor }) => (
              <span
                key={corner}
                role="presentation"
                title="Drag to resize"
                onPointerDown={(event) => begin(event, { kind: "resize", corner, start: area })}
                onPointerMove={move}
                onPointerUp={end}
                onPointerCancel={end}
                className={cn(
                  "absolute size-5 touch-none rounded-full border-2 border-zinc-900 bg-white shadow-md",
                  className,
                  cursor
                )}
              />
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Everything inside the box is shown complete on the top half of your TikTok video — nothing
        cut. Box just the video you&apos;re watching to make it big; “Fill top half” shapes the box so
        it fills the half edge to edge. The recording follows right away.
      </p>
    </section>
  );
}
