import { cameraCrop } from "@/app/recorder/_lib/bubble-geometry";
import type { CameraFraming, StackedLayout } from "@/app/recorder/_lib/types";

// The vertical 9:16 layout: the shared screen on top, the camera filling the
// part below — the TikTok/CapCut reaction look.

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

// The resolution setting's landscape size, turned on its side: 1080p
// becomes 1080×1920.
export function stackedFrameSize(maxWidth: number, maxHeight: number): { width: number; height: number } {
  return { width: even(maxHeight), height: even(maxWidth) };
}

// Before sharing, the screen's shape isn't known; most are 16:9.
export const ASSUMED_SCREEN_ASPECT = 16 / 9;

// The screen never takes more than this share of the height, so a tall
// window can't squeeze the camera out.
const MAX_SCREEN_SHARE = 0.7;

// "Whole screen" gives the screen exactly its own shape — full width, no bars
// — and the camera everything below. "Fill" uses the chosen split and crops.
export function screenShare(layout: StackedLayout, frameAspect: number, screenAspect: number): number {
  if (layout.screenFit === "fill") {
    return layout.split;
  }
  return Math.min(MAX_SCREEN_SHARE, frameAspect / screenAspect);
}

export function stackedRegions(
  width: number,
  height: number,
  layout: StackedLayout,
  screenAspect: number
): { screen: Region; camera: Region } {
  const screenHeight = Math.round(height * screenShare(layout, width / height, screenAspect));
  return {
    screen: { x: 0, y: 0, width, height: screenHeight },
    camera: { x: 0, y: screenHeight, width, height: height - screenHeight },
  };
}

export interface StackedPainter {
  draw: (screen: VideoFrame, webcam: VideoFrame | null) => void;
}

export function createStackedPainter(
  ctx: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
  options: {
    layout: StackedLayout;
    framing: CameraFraming;
    mirrorWebcam: boolean;
  }
): StackedPainter {
  const { layout, framing, mirrorWebcam } = options;

  // Draws `frame` cropped to cover `region` completely.
  const cover = (frame: VideoFrame, region: Region, crop: ReturnType<typeof cameraCrop>) => {
    ctx.drawImage(frame, crop.sx, crop.sy, crop.sw, crop.sh, region.x, region.y, region.width, region.height);
  };

  const drawScreen = (screen: VideoFrame, region: Region) => {
    const aspect = region.width / region.height;
    const { displayWidth: sw, displayHeight: sh } = screen;
    const centered: CameraFraming = { zoom: 1, x: 0.5, y: 0.5 };

    if (layout.screenFit === "fill") {
      cover(screen, region, cameraCrop(sw, sh, centered, false, aspect));
      return;
    }

    // The region already has the screen's shape, so this fills it exactly;
    // only a window taller than the cap gets plain black at its sides.
    const scale = Math.min(region.width / sw, region.height / sh);
    const drawWidth = sw * scale;
    const drawHeight = sh * scale;
    ctx.drawImage(
      screen,
      region.x + (region.width - drawWidth) / 2,
      region.y + (region.height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
  };

  const drawCamera = (webcam: VideoFrame, region: Region) => {
    const crop = cameraCrop(
      webcam.displayWidth,
      webcam.displayHeight,
      framing,
      mirrorWebcam,
      region.width / region.height
    );
    ctx.save();
    ctx.beginPath();
    ctx.rect(region.x, region.y, region.width, region.height);
    ctx.clip();
    if (mirrorWebcam) {
      ctx.translate(region.x * 2 + region.width, 0);
      ctx.scale(-1, 1);
    }
    cover(webcam, region, crop);
    ctx.restore();
  };

  return {
    draw(screen, webcam) {
      // Worked out per frame: the shared window can change shape mid-take.
      const regions = stackedRegions(width, height, layout, screen.displayWidth / screen.displayHeight);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      drawScreen(screen, regions.screen);
      if (webcam) {
        drawCamera(webcam, regions.camera);
      } else {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(regions.camera.x, regions.camera.y, regions.camera.width, regions.camera.height);
      }
      // A hairline where the two halves meet keeps them visually apart.
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(0, regions.camera.y - 1, width, 2);
    },
  };
}
