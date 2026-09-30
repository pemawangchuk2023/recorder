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

export function stackedRegions(
  width: number,
  height: number,
  layout: StackedLayout
): { screen: Region; camera: Region } {
  const screenHeight = Math.round(height * layout.split);
  return {
    screen: { x: 0, y: 0, width, height: screenHeight },
    camera: { x: 0, y: screenHeight, width, height: height - screenHeight },
  };
}

// A tiny canvas the screen is shrunk into; stretching it back up gives a
// soft blur for almost no work, unlike a real blur filter on every frame.
const BLUR_CANVAS_WIDTH = 32;

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
  const regions = stackedRegions(width, height, layout);
  const blurCanvas = new OffscreenCanvas(BLUR_CANVAS_WIDTH, BLUR_CANVAS_WIDTH);
  const blurCtx = blurCanvas.getContext("2d");

  // Draws `frame` cropped to cover `region` completely.
  const cover = (frame: VideoFrame, region: Region, crop: ReturnType<typeof cameraCrop>) => {
    ctx.drawImage(frame, crop.sx, crop.sy, crop.sw, crop.sh, region.x, region.y, region.width, region.height);
  };

  const drawScreen = (screen: VideoFrame) => {
    const region = regions.screen;
    const aspect = region.width / region.height;
    const { displayWidth: sw, displayHeight: sh } = screen;
    const centered: CameraFraming = { zoom: 1, x: 0.5, y: 0.5 };

    if (layout.screenFit === "fill") {
      cover(screen, region, cameraCrop(sw, sh, centered, false, aspect));
      return;
    }

    // Blurred, darkened backdrop filling the space, then the whole screen on top.
    if (blurCtx) {
      const blurHeight = Math.max(1, Math.round((BLUR_CANVAS_WIDTH * sh) / sw));
      if (blurCanvas.height !== blurHeight) {
        blurCanvas.height = blurHeight;
      }
      blurCtx.drawImage(screen, 0, 0, blurCanvas.width, blurCanvas.height);
      const crop = cameraCrop(blurCanvas.width, blurCanvas.height, centered, false, aspect);
      ctx.drawImage(blurCanvas, crop.sx, crop.sy, crop.sw, crop.sh, region.x, region.y, region.width, region.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(region.x, region.y, region.width, region.height);
    }
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

  const drawCamera = (webcam: VideoFrame) => {
    const region = regions.camera;
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
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, width, height);
      drawScreen(screen);
      if (webcam) {
        drawCamera(webcam);
      } else {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(regions.camera.x, regions.camera.y, regions.camera.width, regions.camera.height);
      }
      // A hairline where the two halves meet keeps them from blurring together.
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.fillRect(0, regions.camera.y - 1, width, 2);
    },
  };
}
