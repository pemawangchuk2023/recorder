"use client";

import { AppWindow } from "lucide-react";

// Before recording: the vertical frame, filled entirely by the screen.
export function TikTokScreenPreview() {
  return (
    <div className="grid size-full place-items-center bg-[radial-gradient(ellipse_at_top,var(--color-zinc-800),var(--color-zinc-950))] py-3">
      <div className="flex aspect-9/16 h-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-zinc-800 px-3 text-center shadow-2xl ring-1 ring-white/15">
        <AppWindow className="size-6 text-white/80" aria-hidden="true" />
        <p className="text-xs font-semibold text-white sm:text-sm">Your screen</p>
        <p className="text-[11px] leading-snug text-zinc-400 sm:text-xs">
          Shown complete — box the part you want once you press Start
        </p>
      </div>
    </div>
  );
}
