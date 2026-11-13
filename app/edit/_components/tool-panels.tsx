"use client";

import { ArrowUpRight, EyeOff, RotateCw, Square, Trash2, Type, Undo2, Wand2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ANNOTATION_COLORS } from "@/app/edit/_lib/draw-annotations";
import {
  SPEED_OPTIONS,
  centredCrop,
  cropPixels,
  isCut,
  type Annotation,
  type AnnotationKind,
  type FrameRect,
  type TimeRange,
} from "@/app/edit/_lib/edit-plan";
import { detectSilences, type Envelope } from "@/app/edit/_lib/silence";
import { formatPreciseTime, formatTime } from "@/app/recorder/_lib/format-time";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";
import { cn } from "@/lib/utils";

export const toolButton =
  "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40";
const strongButton =
  "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40";

function PanelTitle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

// ---------------------------------------------------------------- Cut

export type EnvelopeState =
  | { status: "reading"; progress: number }
  | { status: "ready"; envelope: Envelope }
  | { status: "none" };

const PAUSE_OPTIONS = [
  { value: 0.5, label: "half a second" },
  { value: 0.8, label: "0.8 seconds" },
  { value: 1.5, label: "1.5 seconds" },
  { value: 3, label: "3 seconds" },
];

interface CutPanelProps {
  duration: number;
  time: number;
  cuts: TimeRange[];
  selection: TimeRange | null;
  envelope: EnvelopeState;
  onSelectionChange: (selection: TimeRange | null) => void;
  // Each returns false when the cut would leave nothing of the video.
  onCutSelection: () => boolean;
  onKeepSelection: () => boolean;
  onAddCuts: (cuts: TimeRange[]) => boolean;
  onRestore: (cut: TimeRange) => void;
  onSeek: (time: number) => void;
}

export function CutPanel({
  duration,
  time,
  cuts,
  selection,
  envelope,
  onSelectionChange,
  onCutSelection,
  onKeepSelection,
  onAddCuts,
  onRestore,
  onSeek,
}: CutPanelProps) {
  const [minSilence, setMinSilence] = useState(0.8);
  const [note, setNote] = useState<string | null>(null);
  const refused = "That would leave nothing of the video — keep at least half a second.";

  const removeSilences = () => {
    if (envelope.status !== "ready") {
      return;
    }
    const found = detectSilences(envelope.envelope, duration, { minSilence, padding: 0.15 }).filter(
      (silence) => !isCut(cuts, silence)
    );
    if (found.length === 0) {
      setNote("No pauses that long were found (beyond any already cut).");
      return;
    }
    const seconds = found.reduce((total, silence) => total + silence.end - silence.start, 0);
    setNote(
      onAddCuts(found)
        ? `Cut ${found.length} pause${found.length === 1 ? "" : "s"}, ${formatPreciseTime(seconds)} in all. Play it back to check — Undo brings them back.`
        : refused
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <PanelTitle title="Cut">
        Drag across the timeline to select a part, then cut it out — from the start, the end or
        anywhere in the middle. The original recording is never changed.
      </PanelTitle>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={toolButton}
            onClick={() => onSelectionChange({ start: time, end: Math.max(time, selection?.end ?? duration) })}
          >
            Start here <kbd className="font-mono text-xs text-muted-foreground">I</kbd>
          </button>
          <button
            type="button"
            className={toolButton}
            onClick={() => onSelectionChange({ start: Math.min(time, selection?.start ?? 0), end: time })}
          >
            End here <kbd className="font-mono text-xs text-muted-foreground">O</kbd>
          </button>
        </div>
        {selection ? (
          <p className="text-sm tabular-nums">
            Selected {formatPreciseTime(selection.start)} – {formatPreciseTime(selection.end)} (
            {formatPreciseTime(selection.end - selection.start)})
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing selected yet.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={strongButton}
            disabled={!selection}
            onClick={() => setNote(onCutSelection() ? null : refused)}
          >
            Cut selection <kbd className="font-mono text-xs opacity-70">X</kbd>
          </button>
          <button
            type="button"
            className={toolButton}
            disabled={!selection}
            onClick={() => setNote(onKeepSelection() ? null : refused)}
          >
            Keep only selection
          </button>
          <button type="button" className={toolButton} disabled={!selection} onClick={() => onSelectionChange(null)}>
            Clear
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border p-4">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Wand2 className="size-4 text-brand" aria-hidden="true" />
          Remove pauses
        </div>
        {envelope.status === "none" ? (
          <p className="text-sm text-muted-foreground">
            This recording has no sound this browser can read, so there are no pauses to find.
          </p>
        ) : (
          <>
            <label className="flex flex-wrap items-center gap-2 text-sm">
              Cut silences longer than
              <select
                value={minSilence}
                onChange={(event) => setMinSilence(Number(event.target.value))}
                className="rounded-full border border-input bg-card px-3 py-1.5 text-sm"
              >
                {PAUSE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={cn(toolButton, "self-start")}
              disabled={envelope.status !== "ready"}
              onClick={removeSilences}
            >
              {envelope.status === "reading"
                ? `Listening to the recording… ${Math.round(envelope.progress * 100)}%`
                : "Find and cut pauses"}
            </button>
            <p className="text-sm text-muted-foreground">
              Works from loudness alone, on this device. A little quiet is left around speech so it
              doesn&apos;t sound clipped. Music or steady background sound counts as “not silent”.
            </p>
          </>
        )}
      </div>

      {note && (
        <p role="status" className="text-sm font-medium">
          {note}
        </p>
      )}

      {cuts.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold">
            {cuts.length} cut{cuts.length === 1 ? "" : "s"}
          </h4>
          <ul className="flex max-h-56 flex-col divide-y overflow-y-auto rounded-2xl border">
            {cuts.map((cut) => (
              <li key={`${cut.start}-${cut.end}`} className="flex items-center justify-between gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onSeek(Math.max(0, cut.start - 1))}
                  className="text-left text-sm tabular-nums hover:underline"
                  title="Play from just before this cut"
                >
                  {formatPreciseTime(cut.start)} – {formatPreciseTime(cut.end)}
                </button>
                <button
                  type="button"
                  onClick={() => onRestore(cut)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Undo2 className="size-3.5" aria-hidden="true" />
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Crop

export const CROP_SHAPES: { id: string; label: string; aspect: number | "original" | null }[] = [
  { id: "free", label: "Free", aspect: null },
  { id: "original", label: "Original", aspect: "original" },
  { id: "16:9", label: "16:9", aspect: 16 / 9 },
  { id: "9:16", label: "9:16", aspect: 9 / 16 },
  { id: "1:1", label: "1:1", aspect: 1 },
  { id: "4:5", label: "4:5", aspect: 4 / 5 },
];

interface CropPanelProps {
  crop: FrameRect | null;
  shapeId: string;
  frameWidth: number;
  frameHeight: number;
  onChange: (crop: FrameRect | null, shapeId: string) => void;
}

export function CropPanel({ crop, shapeId, frameWidth, frameHeight, onChange }: CropPanelProps) {
  const pixels = cropPixels(crop, frameWidth, frameHeight);
  const choose = (shape: (typeof CROP_SHAPES)[number]) => {
    if (shape.aspect === null) {
      // Free: start from the current frame, or a slightly inset one to grab.
      onChange(crop ?? { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }, shape.id);
      return;
    }
    const aspect = shape.aspect === "original" ? frameWidth / frameHeight : shape.aspect;
    onChange(centredCrop(aspect, frameWidth, frameHeight), shape.id);
  };

  return (
    <div className="flex flex-col gap-5">
      <PanelTitle title="Crop">
        Keep only part of the picture: hide a taskbar, zoom in on one window, or make a vertical
        video. Pick a shape, then drag the frame or its corners on the video.
      </PanelTitle>
      <div role="group" aria-label="Crop shape" className="flex flex-wrap gap-2">
        {CROP_SHAPES.map((shape) => (
          <button
            key={shape.id}
            type="button"
            aria-pressed={crop !== null && shapeId === shape.id}
            onClick={() => choose(shape)}
            className={cn(toolButton, crop !== null && shapeId === shape.id && "bg-foreground text-background hover:bg-foreground")}
          >
            {shape.label}
          </button>
        ))}
      </div>
      <p className="text-sm tabular-nums">
        {crop ? (
          <>
            Saved picture: {pixels.width} × {pixels.height} pixels{" "}
            <span className="text-muted-foreground">
              (from {frameWidth} × {frameHeight})
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Not cropped: {frameWidth} × {frameHeight} pixels.
          </span>
        )}
      </p>
      {crop && (
        <>
          <p className="text-sm text-muted-foreground">
            Cropping never enlarges: the kept area is saved at its own size, so it stays as sharp as
            the original.
          </p>
          <button type="button" className={cn(toolButton, "self-start")} onClick={() => onChange(null, "free")}>
            Remove crop
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Speed

export function SpeedPanel({
  speed,
  keptSeconds,
  onChange,
}: {
  speed: number;
  keptSeconds: number;
  onChange: (speed: number) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <PanelTitle title="Speed">
        Change how fast the saved video plays. Voices keep their natural pitch — faster doesn&apos;t
        mean squeaky.
      </PanelTitle>
      <div role="group" aria-label="Playback speed of the saved video" className="flex flex-wrap gap-2">
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={speed === option}
            onClick={() => onChange(option)}
            className={cn(toolButton, "tabular-nums", speed === option && "bg-foreground text-background hover:bg-foreground")}
          >
            {option}×
          </button>
        ))}
      </div>
      <p className="text-sm tabular-nums">
        The saved video will run {formatPreciseTime(keptSeconds / speed)}
        {speed !== 1 && <span className="text-muted-foreground"> instead of {formatPreciseTime(keptSeconds)}</span>}.
      </p>
      <p className="text-sm text-muted-foreground">
        The preview plays at this speed too. Captions that were burned into the picture while
        recording speed up with it; the transcript and chapters are re-timed to match.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Annotate

const KINDS: { kind: AnnotationKind; label: string; icon: typeof Type; hint: string }[] = [
  { kind: "text", label: "Text", icon: Type, hint: "A label" },
  { kind: "arrow", label: "Arrow", icon: ArrowUpRight, hint: "Point at something" },
  { kind: "box", label: "Box", icon: Square, hint: "Outline an area" },
  { kind: "blur", label: "Blur", icon: EyeOff, hint: "Hide something private" },
];

const KIND_LABEL: Record<AnnotationKind, string> = { text: "Text", arrow: "Arrow", box: "Box", blur: "Blur" };

interface AnnotatePanelProps {
  annotations: Annotation[];
  selectedId: string | null;
  time: number;
  duration: number;
  onAdd: (kind: AnnotationKind) => void;
  onSelect: (id: string | null) => void;
  // `typing` groups a run of small changes into one undo step.
  onChange: (id: string, patch: Partial<Annotation>, typing?: boolean) => void;
  onDelete: (id: string) => void;
  onSeek: (time: number) => void;
}

export function AnnotatePanel({
  annotations,
  selectedId,
  time,
  duration,
  onAdd,
  onSelect,
  onChange,
  onDelete,
  onSeek,
}: AnnotatePanelProps) {
  const selected = annotations.find((annotation) => annotation.id === selectedId);
  const sorted = [...annotations].sort((a, b) => a.start - b.start);

  return (
    <div className="flex flex-col gap-5">
      <PanelTitle title="Annotate">
        Add something at the playhead, then drag it into place on the video. Each one shows for the
        stretch of time you give it, and is drawn into the saved video.
      </PanelTitle>
      <div className="grid grid-cols-2 gap-2">
        {KINDS.map(({ kind, label, icon: Icon, hint }) => (
          <button
            key={kind}
            type="button"
            onClick={() => onAdd(kind)}
            className="flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors hover:bg-muted"
          >
            <Icon className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <span className="flex flex-col">
              <span className="text-sm font-semibold">{label}</span>
              <span className="text-xs text-muted-foreground">{hint}</span>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="flex flex-col gap-4 rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base font-semibold">{KIND_LABEL[selected.kind]}</h4>
            <button
              type="button"
              onClick={() => onDelete(selected.id)}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Remove
            </button>
          </div>
          {selected.kind === "text" && (
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Text
              <input
                value={selected.text}
                maxLength={80}
                onChange={(event) => onChange(selected.id, { text: event.target.value }, true)}
                className="rounded-xl border border-input bg-background px-3 py-2 text-base font-normal"
              />
            </label>
          )}
          {selected.kind !== "blur" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Colour</span>
              <div role="group" aria-label="Colour" className="flex flex-wrap gap-2">
                {ANNOTATION_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={selected.color === color}
                    onClick={() => onChange(selected.id, { color })}
                    className={cn(
                      "size-8 rounded-full border border-border",
                      selected.color === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
          {selected.kind === "arrow" && (
            <button
              type="button"
              className={cn(toolButton, "self-start")}
              onClick={() => onChange(selected.id, { head: ((selected.head + 1) % 4) as Annotation["head"] })}
            >
              <RotateCw className="size-4" aria-hidden="true" />
              Point another way
            </button>
          )}
          {selected.kind === "blur" && (
            <p className="text-sm text-muted-foreground">
              Whatever is under this box is blurred beyond reading in the saved video. Check it covers
              the area for the whole time it&apos;s needed — a window that moves needs a bigger box.
            </p>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium tabular-nums">
              Shows {formatPreciseTime(selected.start)} – {formatPreciseTime(selected.end)}
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={toolButton}
                disabled={time >= selected.end - 0.1}
                onClick={() => onChange(selected.id, { start: time })}
              >
                Start at playhead
              </button>
              <button
                type="button"
                className={toolButton}
                disabled={time <= selected.start + 0.1}
                onClick={() => onChange(selected.id, { end: time })}
              >
                End at playhead
              </button>
              <button type="button" className={toolButton} onClick={() => onChange(selected.id, { start: 0, end: duration })}>
                Whole video
              </button>
            </div>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <ul className="flex max-h-56 flex-col divide-y overflow-y-auto rounded-2xl border">
          {sorted.map((annotation) => (
            <li key={annotation.id}>
              <button
                type="button"
                aria-pressed={annotation.id === selectedId}
                onClick={() => {
                  onSelect(annotation.id);
                  if (time < annotation.start || time >= annotation.end) {
                    onSeek(annotation.start);
                  }
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted",
                  annotation.id === selectedId && "bg-muted font-semibold"
                )}
              >
                <span className="truncate">
                  {KIND_LABEL[annotation.kind]}
                  {annotation.kind === "text" && annotation.text ? `: ${annotation.text}` : ""}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatPreciseTime(annotation.start)} – {formatPreciseTime(annotation.end)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Transcript

interface TranscriptCutsProps {
  transcript: TranscriptSegment[];
  cuts: TimeRange[];
  time: number;
  onToggle: (segment: TranscriptSegment, cut: boolean) => void;
  onSeek: (time: number) => void;
}

export function TranscriptCuts({ transcript, cuts, time, onToggle, onSeek }: TranscriptCutsProps) {
  return (
    <div className="flex flex-col gap-5">
      <PanelTitle title="Edit by text">
        Cut a sentence from the video by cutting it here. Click a line to hear it first.
      </PanelTitle>
      {transcript.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          This recording has no transcript. Turn on live captions before recording to get one — it
          can&apos;t be made afterwards, because speech is only transcribed live, on your device.
        </p>
      ) : (
        <ul className="flex max-h-[28rem] flex-col divide-y overflow-y-auto rounded-2xl border">
          {transcript.map((segment) => {
            const cut = isCut(cuts, segment);
            const current = time >= segment.start && time < segment.end;
            return (
              <li key={`${segment.start}-${segment.end}`} className={cn("flex items-start gap-2 px-3 py-2", current && "bg-muted")}>
                <button
                  type="button"
                  onClick={() => onSeek(segment.start)}
                  className="flex min-w-0 flex-1 gap-3 text-left text-sm"
                >
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatTime(Math.floor(segment.start))}
                  </span>
                  <span className={cn(cut && "text-muted-foreground line-through")}>{segment.text}</span>
                </button>
                <button
                  type="button"
                  aria-pressed={cut}
                  aria-label={cut ? `Restore “${segment.text}”` : `Cut “${segment.text}”`}
                  onClick={() => onToggle(segment, !cut)}
                  className="shrink-0 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-border hover:bg-muted"
                >
                  {cut ? "Restore" : "Cut"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {transcript.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Lines are timed to the sentence, not the word, so a cut may catch a breath on either side —
          play across it to check, and fine-tune on the timeline.
        </p>
      )}
    </div>
  );
}
