import { stackedFrameSize } from "@/app/recorder/_lib/stacked-layout";
import type { FrameRate, ScreenArea } from "@/app/recorder/_lib/types";
import type { VideoCompositor } from "@/app/recorder/_lib/video-compositor";

// TikTok Screen: the Screen + Cam TikTok layout with no camera, the screen
// taking the whole frame. As there, the chosen box is shown complete and is
// never stretched; a take starts on the whole screen.

interface CreateTikTokScreenCompositorOptions {
  screenTrack: MediaStreamVideoTrack;
  maxWidth: number;
  maxHeight: number;
  frameRate: FrameRate;
  area: ScreenArea;
}

const CAPTION_MAX_LINES = 2;
const CAPTION_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

// Worker timers keep firing while this tab is in the background, which is
// exactly when another app is being recorded.
function startWorkerClock(frameRate: number, onTick: () => void): () => void {
  const source = `setInterval(() => postMessage(0), ${1000 / frameRate});`;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
  const worker = new Worker(url);
  worker.onmessage = onTick;
  return () => {
    worker.terminate();
    URL.revokeObjectURL(url);
  };
}

function wrapLastLines(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines.slice(-maxLines);
}

export function createTikTokScreenCompositor(
  options: CreateTikTokScreenCompositorOptions
): VideoCompositor {
  const { screenTrack, frameRate } = options;
  const { width, height } = stackedFrameSize(options.maxWidth, options.maxHeight);
  let area = options.area;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("Canvas 2D rendering isn't available in this browser.");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const generator = new MediaStreamTrackGenerator({ kind: "video" });
  generator.contentHint = frameRate === 60 ? "motion" : "detail";
  const writer = generator.writable.getWriter();

  let stopped = false;
  let screenFrame: VideoFrame | null = null;

  const reader = new MediaStreamTrackProcessor({ track: screenTrack }).readable.getReader();
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          return;
        }
        if (stopped) {
          value.close();
          return;
        }
        screenFrame?.close();
        screenFrame = value;
      }
    } catch {
      // Reader cancelled or track ended.
    }
  })();

  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.042));
  const captionFont = `600 ${fontSize}px ${CAPTION_FONT_FAMILY}`;
  const lineHeight = Math.round(fontSize * 1.3);
  const paddingX = Math.round(fontSize * 0.7);
  const paddingY = Math.round(fontSize * 0.4);
  const captionBottom = height - Math.round(height * 0.06);
  const captionMaxWidth = Math.min(width * 0.8, fontSize * 26);
  let captionLines: string[] = [];
  let captionBoxWidth = 0;

  const drawCaption = () => {
    const boxHeight = captionLines.length * lineHeight + paddingY * 2;
    const boxX = (width - captionBoxWidth) / 2;
    const boxY = captionBottom - boxHeight;

    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, captionBoxWidth, boxHeight, Math.round(fontSize * 0.35));
    ctx.fill();

    ctx.font = captionFont;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    captionLines.forEach((line, index) => {
      ctx.fillText(line, width / 2, boxY + paddingY + lineHeight * (index + 0.5));
    });
  };

  const draw = (screen: VideoFrame) => {
    const sw = screen.displayWidth * area.width;
    const sh = screen.displayHeight * area.height;
    const scale = Math.min(width / sw, height / sh);
    const drawWidth = sw * scale;
    const drawHeight = sh * scale;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      screen,
      screen.displayWidth * area.x,
      screen.displayHeight * area.y,
      sw,
      sh,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    if (captionLines.length > 0) {
      drawCaption();
    }
  };

  const stopClock = startWorkerClock(frameRate, () => {
    if (stopped || !screenFrame) {
      return;
    }
    // Encoder is behind: drop this frame rather than queueing more.
    if (writer.desiredSize !== null && writer.desiredSize <= 0) {
      return;
    }
    draw(screenFrame);
    const frame = new VideoFrame(canvas, { timestamp: Math.round(performance.now() * 1000) });
    // The generator takes ownership of (and closes) written frames.
    writer.write(frame).catch(() => frame.close());
  });

  return {
    videoTrack: generator,
    width,
    height,
    setCaption(text: string) {
      ctx.font = captionFont;
      captionLines = text.trim()
        ? wrapLastLines(ctx, text.trim(), captionMaxWidth - paddingX * 2, CAPTION_MAX_LINES)
        : [];
      captionBoxWidth = captionLines.length
        ? Math.max(...captionLines.map((line) => ctx.measureText(line).width)) + paddingX * 2
        : 0;
    },
    setStackedArea(next: ScreenArea) {
      area = next;
    },
    // There is no camera bubble in this mode.
    setBubblePosition() {},
    setBubbleSize() {},
    setBubbleHidden() {},
    stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      stopClock();
      void reader.cancel().catch(() => {});
      screenFrame?.close();
      screenFrame = null;
      void writer.close().catch(() => {});
      generator.stop();
    },
  };
}
