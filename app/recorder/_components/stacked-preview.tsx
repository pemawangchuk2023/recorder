"use client";

import { AppWindow } from "lucide-react";
import { StreamVideo } from "@/app/recorder/_components/stream-video";
import { cameraFramingStyle } from "@/app/recorder/_lib/bubble-geometry";
import { ASSUMED_SCREEN_ASPECT, screenShare } from "@/app/recorder/_lib/stacked-layout";
import type { RecorderSettings, StackedLayout } from "@/app/recorder/_lib/types";
import { cn } from "@/lib/utils";

const PREVIEW_ASPECT = 9 / 16;

// Before recording: the vertical frame as it will be recorded, with the live
// camera in its place so the split and framing can be judged.
export function StackedPreview({
  cameraStream,
  camera,
  layout,
}: {
  cameraStream: MediaStream | null;
  camera: RecorderSettings["camera"];
  layout: StackedLayout;
}) {
  return (
    <div className="grid size-full place-items-center bg-[radial-gradient(ellipse_at_top,var(--color-zinc-800),var(--color-zinc-950))] py-3">
      <div className="flex aspect-[9/16] h-full flex-col overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/15">
        <div
          className="flex flex-col items-center justify-center gap-2 border-b border-white/15 bg-zinc-800 px-3 text-center transition-[height] duration-200"
          style={{ height: `${screenShare(layout, PREVIEW_ASPECT, ASSUMED_SCREEN_ASPECT) * 100}%` }}
        >
          <AppWindow className="size-6 text-white/80" aria-hidden="true" />
          <p className="text-xs font-semibold text-white sm:text-sm">Your screen</p>
          <p className="text-[11px] leading-snug text-zinc-400 sm:text-xs">
            {layout.screenFit === "fit" ? "Whole screen, edge to edge" : "Cropped to fill"}
          </p>
        </div>
        <div className={cn("relative min-h-0 flex-1 overflow-hidden", camera.mirror && "-scale-x-100")}>
          {cameraStream ? (
            <StreamVideo
              stream={cameraStream}
              className="size-full"
              style={cameraFramingStyle(camera.framing, camera.mirror)}
            />
          ) : (
            <p className="grid size-full place-items-center px-3 text-center text-xs text-zinc-400">
              Starting camera…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
