import type { RecorderSettings, ScreenArea } from "@/app/recorder/_lib/types";

// Screen mode (no camera) with its size set to TikTok 9:16.
export function isTikTokScreen(settings: RecorderSettings): boolean {
  return settings.source === "screen" && !settings.camera.enabled && settings.tiktokScreen.enabled;
}

// Reshapes a box, around its centre, to the video's shape — as tall as it is
// now, or as large as fits the screen — so it fills the frame edge to edge.
export function fillFrameArea(area: ScreenArea, screenAspect: number, frameAspect: number): ScreenArea {
  let height = area.height;
  let width = (height * frameAspect) / screenAspect;
  if (width > 1) {
    width = 1;
    height = screenAspect / frameAspect;
  }
  height = Math.min(1, height);
  const centerX = area.x + area.width / 2;
  const centerY = area.y + area.height / 2;
  return {
    x: Math.min(1 - width, Math.max(0, centerX - width / 2)),
    y: Math.min(1 - height, Math.max(0, centerY - height / 2)),
    width,
    height,
  };
}

export const isWholeScreen = (area: ScreenArea) =>
  area.x === 0 && area.y === 0 && area.width === 1 && area.height === 1;
