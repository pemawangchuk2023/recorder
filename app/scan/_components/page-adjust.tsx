"use client";

import { RotateCcw, RotateCw, ScanSearch, Square } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useBlobUrl } from "@/app/edit/_hooks/use-blob-url";
import { SCAN_FILTERS } from "@/app/scan/_lib/filters";
import { FULL_FRAME, isConvex, type Corners, type Point } from "@/app/scan/_lib/geometry";
import { findCorners, renderPage, type PageSettings } from "@/app/scan/_lib/process-page";
import { cn } from "@/lib/utils";

const CORNER_NAMES = ["Top left", "Top right", "Bottom right", "Bottom left"];
const PREVIEW_SIDE = 1400;

const button =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

// What the page will look like, a moment after each change.
function usePreview(photo: Blob, settings: PageSettings): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let made: string | null = null;
    const timer = setTimeout(() => {
      renderPage(photo, settings, PREVIEW_SIDE)
        .then((rendered) => {
          if (!cancelled) {
            made = URL.createObjectURL(rendered.image);
            setUrl(made);
          }
        })
        .catch(() => {});
    }, 90);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      // The picture already on screen stays until the next one replaces it.
      if (made) {
        URL.revokeObjectURL(made);
      }
    };
  }, [photo, settings]);
  return url;
}

function Slider({
  label,
  value,
  low,
  high,
  onChange,
}: {
  label: string;
  value: number;
  low: string;
  high: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      <span className="flex items-center justify-between">
        {label}
        <span className="tabular-nums text-muted-foreground">{value > 0 ? `+${value}` : value}</span>
      </span>
      <input
        type="range"
        min={-100}
        max={100}
        step={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        onDoubleClick={() => onChange(0)}
        className="h-8 w-full accent-red-600"
      />
      <span className="flex justify-between text-xs font-normal text-muted-foreground" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </span>
    </label>
  );
}

interface PageAdjustProps {
  // The photo the page is made from.
  photo: Blob;
  settings: PageSettings;
  onChange: (settings: PageSettings) => void;
  // False when the page's edges weren't found, so they need placing by hand.
  edgesFound: boolean;
}

// Everything that can be changed about a scanned page, with the result
// shown as it changes: its look, brightness and contrast, which way up it
// is, and where its edges are in the photo.
export function PageAdjust({ photo, settings, onChange, edgesFound }: PageAdjustProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const photoUrl = useBlobUrl(photo);
  const previewUrl = usePreview(photo, settings);
  const [edgeNote, setEdgeNote] = useState<string | null>(null);
  const [edgesOpen, setEdgesOpen] = useState(!edgesFound);
  const valid = isConvex(settings.corners);
  const brightness = settings.brightness ?? 0;
  const contrast = settings.contrast ?? 0;
  const isBlackAndWhite = settings.filter === "bw";
  // The latest settings, for drags that outlive the render they began in.
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  });

  const setCorner = (index: number, point: Point) => {
    const corners = [...settingsRef.current.corners] as Corners;
    corners[index] = { x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) };
    onChange({ ...settingsRef.current, corners });
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    const frame = frameRef.current;
    if (!frame || event.button !== 0) {
      return;
    }
    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    target.focus();
    const bounds = frame.getBoundingClientRect();
    const move = (moveEvent: PointerEvent) =>
      setCorner(index, {
        x: (moveEvent.clientX - bounds.left) / bounds.width,
        y: (moveEvent.clientY - bounds.top) / bounds.height,
      });
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const nudge = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const step = steps[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const size = event.shiftKey ? 0.03 : 0.005;
    const corner = settings.corners[index];
    setCorner(index, { x: corner.x + step[0] * size, y: corner.y + step[1] * size });
  };

  const detect = async () => {
    setEdgeNote(null);
    const { corners, found } = await findCorners(photo);
    onChange({ ...settingsRef.current, corners });
    setEdgeNote(
      found
        ? "Edges found. Check the four corners sit on the paper's corners."
        : "No clear page edge was found (it works best with the page on a darker surface). Drag the corners into place."
    );
  };

  const outline = settings.corners.map((corner) => `${corner.x * 100},${corner.y * 100}`).join(" ");
  const adjusted = brightness !== 0 || contrast !== 0;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="grid min-h-48 place-items-center rounded-2xl bg-muted p-3">
          {previewUrl ? (
            // A local object URL: next/image can't optimise it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="The scanned page as it will be saved" className="max-h-[52vh] w-auto max-w-full shadow-md" />
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Preparing the page…
            </p>
          )}
        </div>

        <div role="radiogroup" aria-label="Look" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          {SCAN_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              role="radio"
              aria-checked={settings.filter === filter.value}
              title={filter.description}
              onClick={() => onChange({ ...settings, filter: filter.value })}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted",
                settings.filter === filter.value && "border-foreground bg-foreground text-background hover:bg-foreground"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border p-4">
          <Slider
            label={isBlackAndWhite ? "Ink" : "Brightness"}
            value={brightness}
            low={isBlackAndWhite ? "Bolder" : "Darker"}
            high={isBlackAndWhite ? "Thinner" : "Brighter"}
            onChange={(value) => onChange({ ...settings, brightness: value })}
          />
          {!isBlackAndWhite && (
            <Slider
              label="Contrast"
              value={contrast}
              low="Softer"
              high="Stronger"
              onChange={(value) => onChange({ ...settings, contrast: value })}
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onChange({ ...settings, turns: (settings.turns + 1) % 4 })} className={button}>
              <RotateCw className="size-4" aria-hidden="true" />
              Turn right
            </button>
            <button
              type="button"
              disabled={!adjusted}
              onClick={() => onChange({ ...settings, brightness: 0, contrast: 0 })}
              className={button}
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset sliders
            </button>
          </div>
        </div>
      </div>

      <section className="rounded-2xl border">
        {/* Folded away on a phone when the edges were found; always open on a wide screen. */}
        <button
          type="button"
          aria-expanded={edgesOpen}
          onClick={() => setEdgesOpen(!edgesOpen)}
          className="flex w-full flex-wrap items-baseline gap-x-2 rounded-2xl px-4 py-3 text-left text-base font-semibold lg:pointer-events-none"
        >
          Adjust the edges
          <span className="text-sm font-normal text-muted-foreground">
            {edgesFound ? "Found automatically — fix them if they're off" : "Not found — drag the corners onto the paper"}
          </span>
        </button>
        <div className={cn("flex-col gap-3 border-t p-4 lg:flex", edgesOpen ? "flex" : "hidden")}>
          <div className="rounded-2xl bg-zinc-950 p-5">
            <div ref={frameRef} className="relative mx-auto w-fit touch-none select-none">
              {photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="The photo this page is made from" draggable={false} className="block max-h-[52vh] w-auto max-w-full" />
              )}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
                <path d={`M0 0H100V100H0Z M${outline.replace(/ /g, " L")}Z`} fillRule="evenodd" fill="rgba(0,0,0,0.55)" />
                <polygon points={outline} fill="none" stroke={valid ? "#38bdf8" : "#ef4444"} strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              {settings.corners.map((corner, index) => (
                <button
                  key={CORNER_NAMES[index]}
                  type="button"
                  aria-label={`${CORNER_NAMES[index]} corner. Drag it, or use the arrow keys (Shift for bigger steps).`}
                  onPointerDown={(event) => startDrag(event, index)}
                  onKeyDown={(event) => nudge(event, index)}
                  className="absolute size-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-sky-500/70 shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-sky-300 active:cursor-grabbing"
                  style={{ left: `${corner.x * 100}%`, top: `${corner.y * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void detect()} className={button}>
              <ScanSearch className="size-4" aria-hidden="true" />
              Find the edges
            </button>
            <button type="button" onClick={() => onChange({ ...settings, corners: FULL_FRAME })} className={button}>
              <Square className="size-4" aria-hidden="true" />
              Use the whole photo
            </button>
          </div>
          {!valid && (
            <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
              The corners are crossed over. Put each one on its own corner of the paper.
            </p>
          )}
          {edgeNote && (
            <p role="status" className="text-sm font-medium">
              {edgeNote}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
