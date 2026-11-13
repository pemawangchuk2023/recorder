import type { Annotation } from "@/app/edit/_lib/edit-plan";

// Draws annotations onto a canvas. The same code draws the editor's preview
// and the saved video, so what is seen while editing is what gets saved.

type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// Where the whole original frame sits on the canvas, in canvas pixels. In
// the preview that's the full canvas; in a cropped render it extends past it.
export interface FramePlacement {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The picture under a blur: an image, and the rectangle of it that the
// original frame occupies.
export interface FramePixels {
  image: CanvasImageSource;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ANNOTATION_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ffffff", "#111827"] as const;

const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

// Blur cells are this share of the box's short side, and at least this many
// pixels of the original video — coarse enough that text can't be read back.
const BLUR_CELL_SHARE = 1 / 8;
const BLUR_MIN_CELL_PIXELS = 16;

let scratch: OffscreenCanvas | HTMLCanvasElement | null = null;

function scratchCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
  if (!scratch) {
    scratch = typeof OffscreenCanvas === "function" ? new OffscreenCanvas(width, height) : document.createElement("canvas");
  }
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width;
    scratch.height = height;
  }
  return scratch;
}

// Text that reads on the annotation's colour.
function contrastColor(color: string): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color)?.[1];
  if (!hex) {
    return "#ffffff";
  }
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return r * 0.299 + g * 0.587 + b * 0.114 > 150 ? "#111827" : "#ffffff";
}

function drawBlur(
  ctx: Context,
  left: number,
  top: number,
  width: number,
  height: number,
  frame: FramePlacement,
  pixels: FramePixels
): void {
  // The same rectangle, in the image's own pixels.
  const scaleX = pixels.width / frame.width;
  const scaleY = pixels.height / frame.height;
  const sourceX = pixels.x + (left - frame.x) * scaleX;
  const sourceY = pixels.y + (top - frame.y) * scaleY;
  const sourceWidth = width * scaleX;
  const sourceHeight = height * scaleY;
  if (sourceWidth < 1 || sourceHeight < 1) {
    return;
  }
  const cell = Math.max(BLUR_MIN_CELL_PIXELS, Math.min(sourceWidth, sourceHeight) * BLUR_CELL_SHARE);
  const columns = Math.max(1, Math.ceil(sourceWidth / cell));
  const rows = Math.max(1, Math.ceil(sourceHeight / cell));
  const small = scratchCanvas(columns, rows);
  const smallCtx = small.getContext("2d") as Context | null;
  if (!smallCtx) {
    // Never show what was meant to be hidden.
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(left, top, width, height);
    return;
  }
  // Shrinking to a few cells averages the picture away; stretching it back
  // gives a soft blur with nothing left to read.
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.imageSmoothingQuality = "high";
  smallCtx.drawImage(pixels.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, columns, rows);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, width, height);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // Drawn a little oversized so the soft edge of the stretch stays outside.
  const bleedX = width / columns / 2;
  const bleedY = height / rows / 2;
  ctx.drawImage(small, 0, 0, columns, rows, left - bleedX, top - bleedY, width + bleedX * 2, height + bleedY * 2);
  ctx.restore();
}

function drawText(ctx: Context, annotation: Annotation, left: number, top: number, width: number, height: number): void {
  const radius = Math.min(width, height) * 0.2;
  ctx.fillStyle = annotation.color;
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, radius);
  ctx.fill();
  const text = annotation.text.trim();
  if (!text) {
    return;
  }
  const padding = height * 0.25;
  let fontSize = height * 0.56;
  ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`;
  // Long text shrinks to fit the label rather than spilling out of it.
  const available = Math.max(1, width - padding * 2);
  const measured = ctx.measureText(text).width;
  if (measured > available) {
    fontSize *= available / measured;
    ctx.font = `600 ${fontSize}px ${FONT_FAMILY}`;
  }
  ctx.fillStyle = contrastColor(annotation.color);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, left + width / 2, top + height / 2 + fontSize * 0.04);
}

function drawBox(ctx: Context, annotation: Annotation, left: number, top: number, width: number, height: number, stroke: number): void {
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = stroke * 1.5;
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = stroke;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(left, top, width, height, stroke * 1.5);
  ctx.stroke();
  ctx.restore();
}

function drawArrow(ctx: Context, annotation: Annotation, left: number, top: number, width: number, height: number, stroke: number): void {
  const corners = [
    [left + width, top + height],
    [left, top + height],
    [left, top],
    [left + width, top],
  ];
  const [headX, headY] = corners[annotation.head];
  const [tailX, tailY] = corners[(annotation.head + 2) % 4];
  const length = Math.hypot(headX - tailX, headY - tailY);
  if (length < 1) {
    return;
  }
  const angle = Math.atan2(headY - tailY, headX - tailX);
  const headLength = Math.min(length * 0.45, stroke * 5);
  const headWidth = headLength * 0.8;
  ctx.save();
  ctx.translate(tailX, tailY);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = stroke * 1.5;
  ctx.fillStyle = annotation.color;
  ctx.strokeStyle = annotation.color;
  ctx.lineWidth = stroke * 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length - headLength * 0.9, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(length - headLength, -headWidth / 2);
  ctx.lineTo(length - headLength, headWidth / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// `pixels` is the video picture, needed only for blur boxes. When the frame
// has already been drawn on this same canvas, pass the canvas itself.
export function drawAnnotations(
  ctx: Context,
  annotations: Annotation[],
  frame: FramePlacement,
  pixels: FramePixels | null
): void {
  // Line widths follow the frame's size, so they look the same at any resolution.
  const stroke = Math.max(2, frame.height * 0.007);
  // Blurs first, so an arrow or label pointing at one stays sharp.
  const ordered = [...annotations].sort((a, b) => Number(b.kind === "blur") - Number(a.kind === "blur"));
  for (const annotation of ordered) {
    const left = frame.x + annotation.x * frame.width;
    const top = frame.y + annotation.y * frame.height;
    const width = annotation.width * frame.width;
    const height = annotation.height * frame.height;
    if (annotation.kind === "blur") {
      if (pixels) {
        drawBlur(ctx, left, top, width, height, frame, pixels);
      } else {
        ctx.fillStyle = "#6b7280";
        ctx.fillRect(left, top, width, height);
      }
    } else if (annotation.kind === "text") {
      drawText(ctx, annotation, left, top, width, height);
    } else if (annotation.kind === "box") {
      drawBox(ctx, annotation, left, top, width, height, stroke);
    } else {
      drawArrow(ctx, annotation, left, top, width, height, stroke);
    }
  }
}
