"use client";

import { Monitor, PictureInPicture2, Video, type LucideIcon } from "lucide-react";
import type { RecordingMode } from "@/app/recorder/_lib/types";
import { RECORDING_MODES } from "@/constants/recorder";
import { cn } from "@/lib/utils";

const MODE_ICONS: Record<RecordingMode, LucideIcon> = {
  "screen-camera": PictureInPicture2,
  screen: Monitor,
  camera: Video,
};

const MODES = Object.keys(RECORDING_MODES) as RecordingMode[];

export function ModePicker({
  value,
  screenSupported,
  onChange,
}: {
  value: RecordingMode;
  screenSupported: boolean;
  onChange: (mode: RecordingMode) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Recording mode" className="grid grid-cols-3 gap-2">
        {MODES.map((mode) => {
          const Icon = MODE_ICONS[mode];
          const selected = value === mode;
          return (
            <button
              key={mode}
              type="button"
              aria-pressed={selected}
              disabled={mode !== "camera" && !screenSupported}
              onClick={() => onChange(mode)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-3.5 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? "border-red-500 bg-red-50 text-red-700 shadow-sm dark:bg-red-950/60 dark:text-red-300"
                  : "border-transparent bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-6" aria-hidden="true" />
              {RECORDING_MODES[mode].label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">{RECORDING_MODES[value].description}</p>
    </div>
  );
}
