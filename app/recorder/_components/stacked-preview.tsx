"use client";

import { AppWindow } from "lucide-react";
import { StreamVideo } from "@/app/recorder/_components/stream-video";
import { cameraFramingStyle } from "@/app/recorder/_lib/bubble-geometry";
import { TIKTOK_SCREEN_SHARE } from "@/constants/recorder";
import type { RecorderSettings } from "@/app/recorder/_lib/types";
import { cn } from "@/lib/utils";

// Before recording: the vertical frame as it will be recorded, with the live
// camera in its place so the split and framing can be judged. With screenOnly
// the screen takes the whole frame and there's no camera to show.
export function StackedPreview({
  cameraStream,
  camera,
  screenOnly,
}: {
  cameraStream: MediaStream | null;
  camera: RecorderSettings["camera"];
  screenOnly: boolean;
}) {
  return (
    <div className="grid size-full place-items-center bg-[radial-gradient(ellipse_at_top,var(--color-zinc-800),var(--color-zinc-950))] py-3">
      <div className="flex aspect-[9/16] h-full flex-col overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/15">
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-2 bg-zinc-800 px-3 text-center transition-[height] duration-200",
            !screenOnly && "border-b-2 border-white"
          )}
          style={{ height: screenOnly ? "100%" : `${TIKTOK_SCREEN_SHARE * 100}%` }}
        >
          <AppWindow className="size-6 text-white/80" aria-hidden="true" />
          <p className="text-xs font-semibold text-white sm:text-sm">Your screen</p>
          <p className="text-[11px] leading-snug text-zinc-400 sm:text-xs">
            Shown complete — box the part you want once you press Start
          </p>
        </div>
        {!screenOnly && (
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
        )}
      </div>
    </div>
  );
}
