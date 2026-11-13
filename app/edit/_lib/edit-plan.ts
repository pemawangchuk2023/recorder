// An edit is a plan, not a changed file: which parts to cut, how to crop, how
// fast to play, and what to draw on top. The original recording is never
// touched; saving renders the plan into a new video.
//
// All times are seconds in the original recording.

export interface TimeRange {
  start: number;
  end: number;
}

// A rectangle as fractions (0–1) of the frame's width and height.
export interface FrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationKind = "text" | "arrow" | "box" | "blur";

export interface Annotation extends FrameRect, TimeRange {
  id: string;
  kind: AnnotationKind;
  // Shown for "text"; unused otherwise.
  text: string;
  // A CSS colour; unused for "blur".
  color: string;
  // Arrows: which corner of the rectangle the arrow points at, clockwise
  // from the bottom right (0) to bottom left, top left and top right.
  head: 0 | 1 | 2 | 3;
}

export interface EditPlan {
  // Parts removed from the video: sorted, never overlapping.
  cuts: TimeRange[];
  // The part of the picture that is kept; null keeps all of it.
  crop: FrameRect | null;
  // 1 is normal speed.
  speed: number;
  annotations: Annotation[];
}

export const EMPTY_PLAN: EditPlan = { cuts: [], crop: null, speed: 1, annotations: [] };

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3] as const;

// Cuts shorter than this are noise from an imprecise drag, not an edit.
export const MIN_CUT_SECONDS = 0.05;
// A video must keep at least this much.
export const MIN_KEPT_SECONDS = 0.5;
// The smallest crop, as a fraction of each side.
export const MIN_CROP = 0.1;

export function isPlanEmpty(plan: EditPlan): boolean {
  return plan.cuts.length === 0 && plan.crop === null && plan.speed === 1 && plan.annotations.length === 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Sorted, merged where they touch or overlap, and kept inside the video.
export function normalizeRanges(ranges: TimeRange[], duration: number): TimeRange[] {
  const sorted = ranges
    .map((range) => ({
      start: clamp(Math.min(range.start, range.end), 0, duration),
      end: clamp(Math.max(range.start, range.end), 0, duration),
    }))
    .filter((range) => range.end - range.start >= MIN_CUT_SECONDS)
    .sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end + 1e-6) {
      last.end = Math.max(last.end, range.end);
    } else {
      merged.push({ ...range });
    }
  }
  return merged;
}

// The parts that stay, in order.
export function keptRanges(cuts: TimeRange[], duration: number): TimeRange[] {
  const kept: TimeRange[] = [];
  let cursor = 0;
  for (const cut of normalizeRanges(cuts, duration)) {
    if (cut.start > cursor) {
      kept.push({ start: cursor, end: cut.start });
    }
    cursor = Math.max(cursor, cut.end);
  }
  if (cursor < duration) {
    kept.push({ start: cursor, end: duration });
  }
  return kept;
}

export function keptSeconds(cuts: TimeRange[], duration: number): number {
  return keptRanges(cuts, duration).reduce((total, range) => total + range.end - range.start, 0);
}

// Length of the saved video in seconds.
export function outputDuration(plan: EditPlan, duration: number): number {
  return keptSeconds(plan.cuts, duration) / plan.speed;
}

// Adds a cut. Returns null when it would leave (almost) nothing of the video.
export function addCut(cuts: TimeRange[], cut: TimeRange, duration: number): TimeRange[] | null {
  const next = normalizeRanges([...cuts, cut], duration);
  return keptSeconds(next, duration) >= MIN_KEPT_SECONDS ? next : null;
}

// Cuts everything outside the range, replacing any earlier cuts outside it.
// Null when the range is too short to keep.
export function keepOnly(cuts: TimeRange[], range: TimeRange, duration: number): TimeRange[] | null {
  const start = Math.min(range.start, range.end);
  const end = Math.max(range.start, range.end);
  const next = normalizeRanges([...cuts, { start: 0, end: start }, { start: end, end: duration }], duration);
  return keptSeconds(next, duration) >= MIN_KEPT_SECONDS ? next : null;
}

// Brings a range back, wherever cuts cover it.
export function restoreRange(cuts: TimeRange[], range: TimeRange, duration: number): TimeRange[] {
  const remaining: TimeRange[] = [];
  for (const cut of cuts) {
    if (cut.end <= range.start || cut.start >= range.end) {
      remaining.push(cut);
      continue;
    }
    remaining.push({ start: cut.start, end: range.start }, { start: range.end, end: cut.end });
  }
  return normalizeRanges(remaining, duration);
}

export function isCut(cuts: TimeRange[], range: TimeRange): boolean {
  return cuts.some((cut) => cut.start <= range.start + 1e-3 && cut.end >= range.end - 1e-3);
}

// While previewing: if the playhead is inside a cut, where it should jump to.
export function skipTarget(time: number, cuts: TimeRange[]): number | null {
  const cut = cuts.find((each) => time >= each.start && time < each.end - 0.01);
  return cut ? cut.end : null;
}

// A moment in the original, as a moment in the saved video. A moment inside
// a cut lands on the join.
export function toOutputTime(time: number, kept: TimeRange[], speed: number): number {
  let before = 0;
  for (const range of kept) {
    if (time < range.start) {
      break;
    }
    if (time <= range.end) {
      return (before + time - range.start) / speed;
    }
    before += range.end - range.start;
  }
  return before / speed;
}

interface Timed {
  start: number;
  end: number;
}

// Re-times caption lines to the saved video. A line that is partly cut keeps
// its text over the part that remains; a line that is wholly cut is dropped.
export function remapSegments<T extends Timed>(segments: T[], kept: TimeRange[], speed: number): T[] {
  const result: T[] = [];
  for (const segment of segments) {
    const overlaps = kept.filter((range) => range.end > segment.start && range.start < segment.end);
    if (overlaps.length === 0) {
      continue;
    }
    const start = toOutputTime(Math.max(segment.start, overlaps[0].start), kept, speed);
    const last = overlaps[overlaps.length - 1];
    const end = toOutputTime(Math.min(segment.end, last.end), kept, speed);
    if (end - start >= 0.05) {
      result.push({ ...segment, start, end });
    }
  }
  return result;
}

// Re-times chapter markers; markers inside a cut are dropped.
export function remapMarkers<T extends { time: number }>(markers: T[], kept: TimeRange[], speed: number): T[] {
  return markers
    .filter((marker) => kept.some((range) => marker.time >= range.start && marker.time < range.end))
    .map((marker) => ({ ...marker, time: toOutputTime(marker.time, kept, speed) }));
}

function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

export interface PixelRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

// The crop in whole pixels. Video encoders need even sizes.
export function cropPixels(crop: FrameRect | null, frameWidth: number, frameHeight: number): PixelRect {
  const maxWidth = Math.floor(frameWidth / 2) * 2;
  const maxHeight = Math.floor(frameHeight / 2) * 2;
  if (!crop) {
    return { left: 0, top: 0, width: maxWidth, height: maxHeight };
  }
  const width = Math.min(even(crop.width * frameWidth), maxWidth);
  const height = Math.min(even(crop.height * frameHeight), maxHeight);
  return {
    left: clamp(Math.round(crop.x * frameWidth), 0, frameWidth - width),
    top: clamp(Math.round(crop.y * frameHeight), 0, frameHeight - height),
    width,
    height,
  };
}

// The largest centred crop with the given shape (width ÷ height).
export function centredCrop(aspect: number, frameWidth: number, frameHeight: number): FrameRect {
  const frameAspect = frameWidth / frameHeight;
  const width = aspect >= frameAspect ? 1 : aspect / frameAspect;
  const height = aspect >= frameAspect ? frameAspect / aspect : 1;
  return { x: (1 - width) / 2, y: (1 - height) / 2, width, height };
}

// Keeps a rectangle inside the frame and no smaller than `min` on each side.
export function clampRect(rect: FrameRect, min = MIN_CROP): FrameRect {
  const width = clamp(rect.width, min, 1);
  const height = clamp(rect.height, min, 1);
  return { x: clamp(rect.x, 0, 1 - width), y: clamp(rect.y, 0, 1 - height), width, height };
}

export function annotationsAt(annotations: Annotation[], time: number): Annotation[] {
  return annotations.filter((annotation) => time >= annotation.start && time < annotation.end);
}
