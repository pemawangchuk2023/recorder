"use client";

import { DraggableBubble } from "@/app/recorder/_components/draggable-bubble";
import { StreamVideo } from "@/app/recorder/_components/stream-video";
import { cameraFramingStyle } from "@/app/recorder/_lib/bubble-geometry";
import type { BubblePosition, RecorderSettings } from "@/app/recorder/_lib/types";
import { cn } from "@/lib/utils";

// Before sharing, the screen's shape isn't known yet; most are 16:9.
const IDLE_FRAME = { width: 1920, height: 1080 };

// The live camera where the bubble will be recorded, draggable to place it
// before recording starts.
export function CameraBubblePreview({
  stream,
  camera,
  onMove,
  onResize,
}: {
  stream: MediaStream;
  camera: RecorderSettings["camera"];
  onMove: (position: BubblePosition) => void;
  onResize: (size: number, position: BubblePosition) => void;
}) {
  return (
    <DraggableBubble
      frame={IDLE_FRAME}
      position={camera.position}
      size={camera.size}
      shape={camera.shape}
      onMove={onMove}
      onResize={onResize}
    >
      {/* Mirroring flips the whole bubble; framing crops the picture inside it. */}
      <div className={cn("pointer-events-none size-full overflow-hidden", camera.mirror && "-scale-x-100")}>
        <StreamVideo
          stream={stream}
          className="size-full"
          style={cameraFramingStyle(camera.framing, camera.mirror)}
        />
      </div>
    </DraggableBubble>
  );
}
