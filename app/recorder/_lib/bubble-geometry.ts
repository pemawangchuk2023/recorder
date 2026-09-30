import type { CSSProperties } from "react";
import type {
  BubbleCorner,
  BubblePosition,
  CameraFraming,
} from "@/app/recorder/_lib/types";
import { BUBBLE_INSET_RATIO, BUBBLE_SIZE_RANGE } from "@/constants/recorder";

// Where the camera bubble sits in a frame. Shared by the compositor, which
// draws it into the video, and the preview, where it's dragged — so what you
// see while dragging is exactly what's recorded.

export interface BubbleRect {
  left: number;
  top: number;
  diameter: number;
}

// The extremes of the position range; clamping turns them into a corner
// with the usual margin.
export const CORNER_POSITIONS: Record<BubbleCorner, BubblePosition> = {
  "top-left": { x: 0, y: 0 },
  "top-right": { x: 1, y: 0 },
  "bottom-left": { x: 0, y: 1 },
  "bottom-right": { x: 1, y: 1 },
};

function clamp(value: number, min: number, max: number): number {
  return min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value));
}

export function clampBubbleSize(size: number): number {
  return Math.min(BUBBLE_SIZE_RANGE.max, Math.max(BUBBLE_SIZE_RANGE.min, size));
}

// The bubble's box in a frame of the given size, kept fully inside it with
// a small margin. `size` is the diameter as a fraction of the frame height.
export function bubbleRect(
  position: BubblePosition,
  size: number,
  frameWidth: number,
  frameHeight: number
): BubbleRect {
  const inset = Math.round(frameHeight * BUBBLE_INSET_RATIO);
  // Never larger than the frame itself, e.g. in a tall, narrow window.
  const diameter = Math.round(
    Math.min(frameHeight * clampBubbleSize(size), frameWidth - 2 * inset, frameHeight - 2 * inset)
  );
  const radius = diameter / 2;
  const centerX = clamp(position.x * frameWidth, inset + radius, frameWidth - inset - radius);
  const centerY = clamp(position.y * frameHeight, inset + radius, frameHeight - inset - radius);
  return { left: Math.round(centerX - radius), top: Math.round(centerY - radius), diameter };
}

// The position that puts the bubble's centre at a point in the frame
// (in pixels), stored already clamped so it never drifts off-frame.
export function positionAt(
  pointX: number,
  pointY: number,
  size: number,
  frameWidth: number,
  frameHeight: number
): BubblePosition {
  const rect = bubbleRect(
    { x: pointX / frameWidth, y: pointY / frameHeight },
    size,
    frameWidth,
    frameHeight
  );
  const radius = rect.diameter / 2;
  return { x: (rect.left + radius) / frameWidth, y: (rect.top + radius) / frameHeight };
}

// The corner a position snaps to, or null once the bubble was dragged elsewhere.
export function cornerOf(position: BubblePosition): BubbleCorner | null {
  const match = (Object.keys(CORNER_POSITIONS) as BubbleCorner[]).find(
    (corner) => CORNER_POSITIONS[corner].x === position.x && CORNER_POSITIONS[corner].y === position.y
  );
  return match ?? null;
}

export interface CameraCrop {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

// Where the framing's centre lies in the camera's own picture: mirroring
// flips the picture, so "left" on screen is the camera's right.
function sourceCenter(framing: CameraFraming, mirror: boolean): { x: number; y: number } {
  return { x: mirror ? 1 - framing.x : framing.x, y: framing.y };
}

// The part of the camera picture that fills a box of the given shape
// (width ÷ height; 1 for the bubble), in camera pixels — like object-fit:
// cover, then zoomed about the framing's centre.
export function cameraCrop(
  cameraWidth: number,
  cameraHeight: number,
  framing: CameraFraming,
  mirror: boolean,
  boxAspect = 1
): CameraCrop {
  const zoom = Math.max(1, framing.zoom);
  const coversWidth = cameraWidth / cameraHeight > boxAspect;
  const sh = (coversWidth ? cameraHeight : cameraWidth / boxAspect) / zoom;
  const sw = sh * boxAspect;
  const center = sourceCenter(framing, mirror);
  return { sx: center.x * (cameraWidth - sw), sy: center.y * (cameraHeight - sh), sw, sh };
}

// The same crop for a <video> filling a square element with object-fit: cover.
// Scaling about the kept point zooms without moving it, which matches
// cameraCrop exactly.
export function cameraFramingStyle(framing: CameraFraming, mirror: boolean): CSSProperties {
  const center = sourceCenter(framing, mirror);
  const point = `${center.x * 100}% ${center.y * 100}%`;
  return {
    objectFit: "cover",
    objectPosition: point,
    transform: framing.zoom > 1 ? `scale(${framing.zoom})` : undefined,
    transformOrigin: point,
  };
}
