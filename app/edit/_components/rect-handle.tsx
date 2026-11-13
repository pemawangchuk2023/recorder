"use client";

import type { KeyboardEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { clampRect, type FrameRect } from "@/app/edit/_lib/edit-plan";
import { cn } from "@/lib/utils";

type Corner = "nw" | "ne" | "sw" | "se";

interface RectHandleProps {
  rect: FrameRect;
  // The element the fractions are measured against (the video frame).
  containerRef: RefObject<HTMLElement | null>;
  onChange: (rect: FrameRect) => void;
  // The drag or key press is over.
  onCommit: () => void;
  label: string;
  // Width ÷ height to hold while resizing, in fractions of the frame.
  aspect?: number;
  minSize?: number;
  className?: string;
}

const CORNERS: { corner: Corner; className: string }[] = [
  { corner: "nw", className: "-top-2 -left-2 cursor-nwse-resize" },
  { corner: "ne", className: "-top-2 -right-2 cursor-nesw-resize" },
  { corner: "sw", className: "-bottom-2 -left-2 cursor-nesw-resize" },
  { corner: "se", className: "-right-2 -bottom-2 cursor-nwse-resize" },
];

// A rectangle over the video that can be dragged, resized from its corners,
// and nudged with the arrow keys (Shift for bigger steps, Alt to resize).
export function RectHandle({
  rect,
  containerRef,
  onChange,
  onCommit,
  label,
  aspect,
  minSize = 0.03,
  className,
}: RectHandleProps) {
  const startDrag = (event: ReactPointerEvent<HTMLElement>, corner: Corner | null) => {
    const container = containerRef.current;
    if (!container || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const bounds = container.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const start = rect;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / bounds.width;
      const dy = (moveEvent.clientY - startY) / bounds.height;
      if (!corner) {
        onChange(clampRect({ ...start, x: start.x + dx, y: start.y + dy }, minSize));
        return;
      }
      // The corner opposite the dragged one stays where it is.
      const anchorX = corner.includes("w") ? start.x + start.width : start.x;
      const anchorY = corner.includes("n") ? start.y + start.height : start.y;
      const roomX = corner.includes("w") ? anchorX : 1 - anchorX;
      const roomY = corner.includes("n") ? anchorY : 1 - anchorY;
      let width = Math.min(roomX, Math.max(minSize, corner.includes("w") ? start.width - dx : start.width + dx));
      let height = Math.min(roomY, Math.max(minSize, corner.includes("n") ? start.height - dy : start.height + dy));
      if (aspect) {
        height = width / aspect;
        if (height > roomY) {
          height = roomY;
          width = height * aspect;
        }
      }
      onChange({
        x: corner.includes("w") ? anchorX - width : anchorX,
        y: corner.includes("n") ? anchorY - height : anchorY,
        width,
        height,
      });
    };
    const end = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", end);
      target.removeEventListener("pointercancel", end);
      onCommit();
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", end);
    target.addEventListener("pointercancel", end);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const directions: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const direction = directions[event.key];
    if (!direction) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 0.05 : 0.01;
    const [dx, dy] = [direction[0] * step, direction[1] * step];
    if (event.altKey) {
      const width = Math.max(minSize, rect.width + dx);
      onChange(clampRect({ ...rect, width, height: aspect ? width / aspect : Math.max(minSize, rect.height + dy) }, minSize));
    } else {
      onChange(clampRect({ ...rect, x: rect.x + dx, y: rect.y + dy }, minSize));
    }
    onCommit();
  };

  return (
    <div
      role="group"
      tabIndex={0}
      aria-label={`${label}. Arrow keys move it; hold Alt to resize, Shift for bigger steps.`}
      onPointerDown={(event) => startDrag(event, null)}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute cursor-move touch-none border-2 border-white outline-none ring-1 ring-black/60 focus-visible:ring-4 focus-visible:ring-sky-400",
        className
      )}
      style={{
        left: `${rect.x * 100}%`,
        top: `${rect.y * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
      }}
    >
      {CORNERS.map(({ corner, className: cornerClass }) => (
        <span
          key={corner}
          aria-hidden="true"
          onPointerDown={(event) => startDrag(event, corner)}
          className={cn("absolute size-4 touch-none rounded-full border-2 border-white bg-sky-500 shadow", cornerClass)}
        />
      ))}
    </div>
  );
}
