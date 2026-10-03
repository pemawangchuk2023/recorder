import { cameraCrop } from "@/app/recorder/_lib/bubble-geometry";
import type { CameraFraming, ScreenArea, StackedLayout } from "@/app/recorder/_lib/types";
import { TIKTOK_SCREEN_SHARE } from "@/constants/recorder";

// The vertical 9:16 "TikTok fit" layout, split exactly in half: the chosen
// part of the shared screen on the top half, shown complete — never cropped
// — and the camera filling the bottom half.

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

// Width ÷ height of the top half: the shape an area must have to fill it.
export function topHalfAspect(frameWidth: number, frameHeight: number): number {
  return frameWidth / Math.round(frameHeight * TIKTOK_SCREEN_SHARE);
}

export function stackedRegions(width: number, height: number): { screen: Region; camera: Region } {
  const screenHeight = Math.round(height * TIKTOK_SCREEN_SHARE);
  return {
    screen: { x: 0, y: 0, width, height: screenHeight },
    camera: { x: 0, y: screenHeight, width, height: height - screenHeight },
  };
}

// The dividing line's thickness as a share of the frame's height (4 px at 1920).
const DIVIDER_RATIO = 4 / 1920;

export interface StackedPainter {
  draw: (screen: VideoFrame, webcam: VideoFrame | null) => void;
  // The part of the screen shown on top; can change mid-recording.
  setArea: (area: ScreenArea) => void;
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
  const { framing, mirrorWebcam } = options;
  let area = options.layout.area;

  // The whole area, scaled to fit the top half and resting on its bottom edge,
  // right against the divider. An area of a different shape leaves plain
  // black above it (or at its sides) — never a dark band between the halves.
  const drawScreen = (screen: VideoFrame, region: Region) => {
    const sw = screen.displayWidth * area.width;
    const sh = screen.displayHeight * area.height;
    const scale = Math.min(region.width / sw, region.height / sh);
    const drawWidth = sw * scale;
    const drawHeight = sh * scale;
    ctx.drawImage(
      screen,
      screen.displayWidth * area.x,
      screen.displayHeight * area.y,
      sw,
      sh,
      region.x + (region.width - drawWidth) / 2,
      region.y + region.height - drawHeight,
      drawWidth,
      drawHeight
    );
  };

  // The camera covers its region completely, framed as chosen.
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
    ctx.drawImage(webcam, crop.sx, crop.sy, crop.sw, crop.sh, region.x, region.y, region.width, region.height);
    ctx.restore();
  };

  return {
    draw(screen, webcam) {
      const regions = stackedRegions(width, height);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      drawScreen(screen, regions.screen);
      if (webcam) {
        drawCamera(webcam, regions.camera);
      } else {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(regions.camera.x, regions.camera.y, regions.camera.width, regions.camera.height);
      }
      // One clean line where the halves meet.
      const line = Math.max(2, Math.round(height * DIVIDER_RATIO));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, regions.camera.y - Math.floor(line / 2), width, line);
    },
    setArea(next) {
      area = next;
    },
  };
}
