"use client";

import { RotateCw, ScanSearch, Square } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useBlobUrl } from "@/app/edit/_hooks/use-blob-url";
import { SCAN_FILTERS, type ScanFilter } from "@/app/scan/_lib/filters";
import { FULL_FRAME, isConvex, type Corners, type Point } from "@/app/scan/_lib/geometry";
import { findCorners, renderPage, type PageSettings } from "@/app/scan/_lib/process-page";
import { isStorageFull, updatePage, type ScanPage } from "@/app/scan/_lib/scans";
import { cn } from "@/lib/utils";

const CORNER_NAMES = ["Top left", "Top right", "Bottom right", "Bottom left"];
const PREVIEW_SIDE = 700;

const button =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";

// Shows what the page will look like, a moment after each change.
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
    }, 120);
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

interface PageEditorProps {
  page: ScanPage;
  pageNumber: number;
  onClose: () => void;
}

// Adjusts one page: drag its four corners onto the paper's corners, turn it,
// and pick how it should look.
export function PageEditor({ page, pageNumber, onClose }: PageEditorProps) {
  const [settings, setSettings] = useState<PageSettings>({
    corners: page.corners,
    filter: page.filter,
    turns: page.turns,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const photoUrl = useBlobUrl(page.photo);
  const previewUrl = usePreview(page.photo, settings);
  const valid = isConvex(settings.corners);

  const setCorner = (index: number, point: Point) => {
    const corners = [...settings.corners] as Corners;
    corners[index] = { x: Math.min(1, Math.max(0, point.x)), y: Math.min(1, Math.max(0, point.y)) };
    setSettings({ ...settings, corners });
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
    const move = (moveEvent: PointerEvent) => {
      setSettings((previous) => {
        const corners = [...previous.corners] as Corners;
        corners[index] = {
          x: Math.min(1, Math.max(0, (moveEvent.clientX - bounds.left) / bounds.width)),
          y: Math.min(1, Math.max(0, (moveEvent.clientY - bounds.top) / bounds.height)),
        };
        return { ...previous, corners };
      });
    };
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
    setMessage(null);
    const { corners, found } = await findCorners(page.photo);
    setSettings((previous) => ({ ...previous, corners }));
    setMessage(
      found
        ? "Edges found. Check the four corners sit on the paper's corners."
        : "No clear page edge was found (it works best with the page on a darker surface). Drag the corners into place."
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updatePage(page, settings);
      onClose();
    } catch (cause) {
      setMessage(
        isStorageFull(cause)
          ? "Browser storage is full, so the change couldn't be saved. Delete scans or recordings you no longer need."
          : "The page couldn't be saved. Try again."
      );
      setSaving(false);
    }
  };

  const outline = settings.corners.map((corner) => `${corner.x * 100},${corner.y * 100}`).join(" ");

  return (
    <section aria-label={`Adjust page ${pageNumber}`} className="flex flex-col gap-5 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Adjust page {pageNumber}</h2>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className={button}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !valid}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save page"}
          </button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Your photo</h3>
          <div className="rounded-2xl bg-zinc-950 p-4">
            <div ref={frameRef} className="relative mx-auto w-fit touch-none select-none">
              {photoUrl && (
                // A local object URL: next/image can't optimise it.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="The photo this page was made from" draggable={false} className="block max-h-[60vh] w-auto max-w-full" />
              )}
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
                <path d={`M0 0H100V100H0Z M${outline.replace(/ /g, " L")}Z`} fillRule="evenodd" fill="rgba(0,0,0,0.55)" />
                <polygon
                  points={outline}
                  fill="none"
                  stroke={valid ? "#38bdf8" : "#ef4444"}
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {settings.corners.map((corner, index) => (
                <button
                  key={CORNER_NAMES[index]}
                  type="button"
                  aria-label={`${CORNER_NAMES[index]} corner. Drag it, or use the arrow keys (Shift for bigger steps).`}
                  onPointerDown={(event) => startDrag(event, index)}
                  onKeyDown={(event) => nudge(event, index)}
                  className="absolute size-9 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-full border-2 border-white bg-sky-500/80 shadow-lg outline-none focus-visible:ring-4 focus-visible:ring-sky-300 active:cursor-grabbing"
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
            <button type="button" onClick={() => setSettings({ ...settings, corners: FULL_FRAME })} className={button}>
              <Square className="size-4" aria-hidden="true" />
              Use the whole photo
            </button>
          </div>
          {!valid && (
            <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
              The corners are crossed over. Put each one on its own corner of the paper.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">The scanned page</h3>
          <div className="grid min-h-48 place-items-center rounded-2xl bg-muted p-4">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Preview of the scanned page" className="max-h-[60vh] w-auto max-w-full shadow-md" />
            ) : (
              <p className="text-sm text-muted-foreground">Preparing the preview…</p>
            )}
          </div>
          <div role="radiogroup" aria-label="Look" className="grid grid-cols-2 gap-2">
            {SCAN_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                role="radio"
                aria-checked={settings.filter === filter.value}
                onClick={() => setSettings({ ...settings, filter: filter.value as ScanFilter })}
                className={cn(
                  "flex flex-col gap-0.5 rounded-2xl border px-3 py-2.5 text-left transition-colors hover:bg-muted",
                  settings.filter === filter.value && "border-foreground bg-muted"
                )}
              >
                <span className="text-sm font-semibold">{filter.label}</span>
                <span className="text-xs text-muted-foreground">{filter.description}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSettings({ ...settings, turns: (settings.turns + 1) % 4 })}
            className={cn(button, "self-start")}
          >
            <RotateCw className="size-4" aria-hidden="true" />
            Turn right
          </button>
        </div>
      </div>
      {message && (
        <p role="status" className="text-sm font-medium">
          {message}
        </p>
      )}
    </section>
  );
}
