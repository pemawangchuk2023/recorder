"use client";

import type { CSSProperties } from "react";
import { StreamVideo } from "@/app/recorder/_components/stream-video";
import type { RecorderSettings } from "@/app/recorder/_lib/types";
import { BUBBLE_INSET_RATIO, BUBBLE_SIZE_RATIO, ROUNDED_BUBBLE_RADIUS } from "@/constants/recorder";
import { cn } from "@/lib/utils";

// The preview frame is 16:9, so a length relative to its height is 9/16 of
// that relative to its width.
const HEIGHT_TO_WIDTH = 9 / 16;

// Where the compositor will draw the camera bubble, drawn with the same
// proportions so the settings can be judged before recording.
export function CameraBubblePreview({
  stream,
  camera,
}: {
  stream: MediaStream;
  camera: RecorderSettings["camera"];
}) {
  const inset = BUBBLE_INSET_RATIO * 100;
  const style: CSSProperties = {
    height: `${BUBBLE_SIZE_RATIO[camera.size] * 100}%`,
    borderRadius: camera.shape === "circle" ? "50%" : `${ROUNDED_BUBBLE_RADIUS * 100}%`,
    [camera.corner.startsWith("top") ? "top" : "bottom"]: `${inset}%`,
    [camera.corner.endsWith("left") ? "left" : "right"]: `${inset * HEIGHT_TO_WIDTH}%`,
  };
  return (
    <div
      className="absolute aspect-square overflow-hidden bg-zinc-800 shadow-xl shadow-black/40 transition-all duration-300"
      style={style}
    >
      <StreamVideo
        stream={stream}
        className={cn("size-full object-cover", camera.mirror && "-scale-x-100")}
      />
    </div>
  );
}
