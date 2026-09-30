"use client";

import { Move } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { bubbleRect, clampBubbleSize, positionAt } from "@/app/recorder/_lib/bubble-geometry";
import type { BubblePosition, BubbleShape } from "@/app/recorder/_lib/types";
import { ROUNDED_BUBBLE_RADIUS } from "@/constants/recorder";
import { cn } from "@/lib/utils";

interface DraggableBubbleProps {
  // The recorded frame's size; the overlay is fitted into the preview the
  // same way the video is ("contain"), so the bubble lines up exactly.
  frame: { width: number; height: number };
  position: BubblePosition;
  // Diameter as a fraction of the frame height.
  size: number;
  shape: BubbleShape;
  onMove: (position: BubblePosition) => void;
  // Resizing from the bottom-right handle keeps the top-left edge in place,
  // so the position changes along with the size.
  onResize: (size: number, position: BubblePosition) => void;
  // The camera picture before recording; empty while recording, when the
  // bubble is part of the video and this is just the handle on top of it.
  children?: ReactNode;
}

// Arrow keys move the bubble by this share of the frame; Shift moves further.
const KEY_STEP = 0.02;
const KEY_STEP_LARGE = 0.1;
// + and − resize by this share of the frame height.
const KEY_RESIZE_STEP = 0.04;

// The resize handle sits on the bubble's edge at the bottom right: 45° round
// a circle, or the corner of the rounded square.
const HANDLE_AT: Record<BubbleShape, number> = {
  circle: 0.5 + Math.SQRT1_2 / 2,
  rounded: 1 - ROUNDED_BUBBLE_RADIUS * (1 - Math.SQRT1_2),
};

type Gesture =
  | { kind: "move"; grabX: number; grabY: number }
  | { kind: "resize"; left: number; top: number };

export function DraggableBubble({
  frame,
  position,
  size,
  shape,
  onMove,
  onResize,
  children,
}: DraggableBubbleProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [active, setActive] = useState<Gesture["kind"] | null>(null);

  const rect = bubbleRect(position, size, frame.width, frame.height);
  const radius = rect.diameter / 2;
  const centerX = rect.left + radius;
  const centerY = rect.top + radius;

  // Pointer coordinates → frame pixels.
  const toFrame = (event: PointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width === 0) {
      return null;
    }
    const scale = frame.width / box.width;
    return { x: (event.clientX - box.left) * scale, y: (event.clientY - box.top) * scale };
  };

  const startGesture = (event: PointerEvent<HTMLElement>, kind: Gesture["kind"]) => {
    const point = toFrame(event);
    if (!point || event.button !== 0) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gestureRef.current =
      kind === "move"
        ? { kind, grabX: point.x - centerX, grabY: point.y - centerY }
        : { kind, left: rect.left, top: rect.top };
    setActive(kind);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const gesture = gestureRef.current;
    const point = gesture ? toFrame(event) : null;
    if (!gesture || !point) {
      return;
    }
    if (gesture.kind === "move") {
      onMove(positionAt(point.x - gesture.grabX, point.y - gesture.grabY, size, frame.width, frame.height));
    } else {
      // Keep the handle under the pointer: it sits HANDLE_AT × diameter right
      // of and below the top-left edge, so project the pointer onto that diagonal.
      const diameter =
        (point.x - gesture.left + (point.y - gesture.top)) / (2 * HANDLE_AT[shape]);
      const next = clampBubbleSize(diameter / frame.height);
      const nextRadius = (next * frame.height) / 2;
      onResize(
        next,
        positionAt(gesture.left + nextRadius, gesture.top + nextRadius, next, frame.width, frame.height)
      );
    }
  };

  const endGesture = () => {
    gestureRef.current = null;
    setActive(null);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "+" || event.key === "=" || event.key === "-") {
      event.preventDefault();
      const next = clampBubbleSize(size + (event.key === "-" ? -KEY_RESIZE_STEP : KEY_RESIZE_STEP));
      onResize(next, positionAt(centerX, centerY, next, frame.width, frame.height));
      return;
    }
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) {
      return;
    }
    event.preventDefault();
    onMove(
      positionAt(
        centerX + move[0] * frame.width,
        centerY + move[1] * frame.height,
        size,
        frame.width,
        frame.height
      )
    );
  };

  const borderRadius = shape === "circle" ? "50%" : `${ROUNDED_BUBBLE_RADIUS * 100}%`;
  const handleAt = `${HANDLE_AT[shape] * 100}%`;

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center [container-type:size]">
      <div
        ref={boxRef}
        className="relative"
        style={{
          width: `min(100cqw, calc(100cqh * ${frame.width / frame.height}))`,
          aspectRatio: `${frame.width} / ${frame.height}`,
        }}
      >
        <div
          className={cn("group/bubble absolute", !active && "transition-[left,top,width] duration-200")}
          style={{
            left: `${(rect.left / frame.width) * 100}%`,
            top: `${(rect.top / frame.height) * 100}%`,
            width: `${(rect.diameter / frame.width) * 100}%`,
            aspectRatio: "1",
          }}
        >
          <button
            type="button"
            aria-label="Camera bubble. Drag or use the arrow keys to move it; press + or − to resize."
            onPointerDown={(event) => startGesture(event, "move")}
            onPointerMove={handlePointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            onKeyDown={handleKeyDown}
            className={cn(
              "pointer-events-auto absolute inset-0 touch-none overflow-hidden outline-none select-none",
              "focus-visible:ring-4 focus-visible:ring-white/80",
              active === "move" ? "cursor-grabbing" : "cursor-grab",
              children ? "bg-zinc-800 shadow-xl shadow-black/40" : "group-hover/bubble:ring-4 group-hover/bubble:ring-white/70",
              active && "ring-4 ring-white/90"
            )}
            style={{ borderRadius }}
          >
            {children}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 grid place-items-center bg-black/35 text-white opacity-0 transition-opacity",
                active === "move" ? "opacity-100" : "group-hover/bubble:opacity-100"
              )}
            >
              <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold">
                <Move className="size-3.5" />
                Drag
              </span>
            </span>
          </button>
          <span
            role="presentation"
            title="Drag to resize"
            onPointerDown={(event) => startGesture(event, "resize")}
            onPointerMove={handlePointerMove}
            onPointerUp={endGesture}
            onPointerCancel={endGesture}
            className={cn(
              "pointer-events-auto absolute size-5 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize touch-none rounded-full border-2 border-zinc-900 bg-white shadow-md transition-opacity",
              active ? "opacity-100" : "opacity-0 group-hover/bubble:opacity-100"
            )}
            style={{ left: handleAt, top: handleAt }}
          />
        </div>
      </div>
    </div>
  );
}
