import { bubbleRect, cameraCrop } from "@/app/recorder/_lib/bubble-geometry";
import { createStackedPainter, stackedFrameSize } from "@/app/recorder/_lib/stacked-layout";
import type {
  BubblePosition,
  BubbleShape,
  CameraFraming,
  FrameRate,
  ScreenArea,
  StackedLayout,
} from "@/app/recorder/_lib/types";
import { ROUNDED_BUBBLE_RADIUS } from "@/constants/recorder";

export interface VideoCompositor {
  videoTrack: MediaStreamVideoTrack;
  // Every output frame has exactly this size.
  width: number;
  height: number;
  setCaption: (text: string) => void;
  // Move or hide the camera bubble mid-recording, e.g. off a slide's text.
  setBubblePosition: (position: BubblePosition) => void;
  setBubbleHidden: (hidden: boolean) => void;
  setBubbleSize: (size: number) => void;
  // Stacked layout: the part of the screen shown on top.
  setStackedArea: (area: ScreenArea) => void;
  stop: () => void;
}

interface CreateVideoCompositorOptions {
  screenTrack: MediaStreamVideoTrack;
  webcamTrack: MediaStreamVideoTrack | null;
  maxWidth: number;
  maxHeight: number;
  frameRate: FrameRate;
  position: BubblePosition;
  // Diameter as a fraction of the frame height.
  size: number;
  shape: BubbleShape;
  framing: CameraFraming;
  // Set for the vertical screen-over-camera layout; the bubble options are
  // then unused.
  stacked: StackedLayout | null;
  // Mirror the camera bubble, or the whole picture when it is the camera.
  mirrorWebcam: boolean;
  mirrorScreen: boolean;
}

const CAPTION_MAX_LINES = 2;
const CAPTION_FONT_FAMILY =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';

export function isVideoCompositorSupported(): boolean {
  return (
    typeof MediaStreamTrackProcessor === "function" &&
    typeof MediaStreamTrackGenerator === "function" &&
    typeof OffscreenCanvas === "function" &&
    typeof VideoFrame === "function"
  );
}

function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

// Keep the shared screen's aspect ratio (no stretching) and never upscale.
function outputSize(
  track: MediaStreamTrack,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const { width, height } = track.getSettings();
  if (!width || !height) {
    return { width: maxWidth, height: maxHeight };
  }
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: even(width * scale), height: even(height * scale) };
}

// Page timers and requestAnimationFrame are paused or throttled while this
// tab is in the background — which is exactly when you're recording another
// app. Worker timers keep firing, so the frame clock lives in a worker.
function startWorkerClock(frameRate: number, onTick: () => void): () => void {
  const source = `setInterval(() => postMessage(0), ${1000 / frameRate});`;
  const url = URL.createObjectURL(
    new Blob([source], { type: "text/javascript" })
  );
  const worker = new Worker(url);
  worker.onmessage = onTick;
  return () => {
    worker.terminate();
    URL.revokeObjectURL(url);
  };
}

function readLatestFrames(
  track: MediaStreamVideoTrack,
  onFrame: (frame: VideoFrame) => void
): ReadableStreamDefaultReader<VideoFrame> {
  const reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
  void (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) {
          return;
        }
        onFrame(value);
      }
    } catch {
      // Reader cancelled or track ended.
    }
  })();
  return reader;
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

export function createVideoCompositor(
  options: CreateVideoCompositorOptions
): VideoCompositor {
  const { screenTrack, webcamTrack, frameRate, shape, framing, stacked, mirrorWebcam, mirrorScreen } =
    options;
  let size = options.size;
  const { width, height } = stacked
    ? stackedFrameSize(options.maxWidth, options.maxHeight)
    : outputSize(screenTrack, options.maxWidth, options.maxHeight);

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
  let webcamFrame: VideoFrame | null = null;

  const keepLatest =
    (assign: (frame: VideoFrame | null) => VideoFrame | null) =>
    (frame: VideoFrame) => {
      if (stopped) {
        frame.close();
        return;
      }
      assign(frame)?.close();
    };

  const screenReader = readLatestFrames(
    screenTrack,
    keepLatest((frame) => {
      const previous = screenFrame;
      screenFrame = frame;
      return previous;
    })
  );
  const webcamReader = webcamTrack
    ? readLatestFrames(
        webcamTrack,
        keepLatest((frame) => {
          const previous = webcamFrame;
          webcamFrame = frame;
          return previous;
        })
      )
    : null;

  // Camera bubble geometry: a circle or rounded square, movable while recording.
  let bubbleHidden = false;
  let bubbleX = 0;
  let bubbleY = 0;
  let diameter = 0;
  let radius = 0;
  let centerX = 0;
  let centerY = 0;

  // Caption geometry: centered near the bottom, kept clear of the bubble —
  // beside it when there's room, above it otherwise.
  // Sized from the short side, so a vertical video gets phone-sized captions.
  const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.042));
  const captionFont = `600 ${fontSize}px ${CAPTION_FONT_FAMILY}`;
  const lineHeight = Math.round(fontSize * 1.3);
  const paddingX = Math.round(fontSize * 0.7);
  const paddingY = Math.round(fontSize * 0.4);
  const gap = Math.round(height * 0.02);
  const defaultCaptionBottom = height - Math.round(height * 0.06);
  // ~50 characters per line at most, like broadcast subtitles.
  const defaultCaptionMaxWidth = Math.min(width * 0.8, fontSize * 26);
  const captionBandTop =
    defaultCaptionBottom - CAPTION_MAX_LINES * lineHeight - paddingY * 2 - gap;
  let captionBottom = defaultCaptionBottom;
  let captionMaxWidth = defaultCaptionMaxWidth;
  let captionText = "";
  let captionLines: string[] = [];
  let captionBoxWidth = 0;

  const layoutCaption = () => {
    ctx.font = captionFont;
    captionLines = captionText
      ? wrapLastLines(ctx, captionText, captionMaxWidth - paddingX * 2, CAPTION_MAX_LINES)
      : [];
    captionBoxWidth = captionLines.length
      ? Math.max(...captionLines.map((line) => ctx.measureText(line).width)) + paddingX * 2
      : 0;
  };

  const placeBubble = (position: BubblePosition) => {
    const rect = bubbleRect(position, size, width, height);
    ({ left: bubbleX, top: bubbleY, diameter } = rect);
    radius = diameter / 2;
    centerX = bubbleX + radius;
    centerY = bubbleY + radius;

    captionBottom = defaultCaptionBottom;
    captionMaxWidth = defaultCaptionMaxWidth;
    const overlapsCaptions =
      webcamTrack && !stacked && !bubbleHidden && bubbleY + diameter > captionBandTop;
    if (overlapsCaptions) {
      // Room on each side of the centre line, up to the bubble's near edge.
      const halfClear =
        centerX < width / 2 ? width / 2 - (bubbleX + diameter) - gap : bubbleX - gap - width / 2;
      if (halfClear * 2 >= width * 0.5) {
        captionMaxWidth = Math.min(defaultCaptionMaxWidth, halfClear * 2);
      } else {
        captionBottom = bubbleY - gap;
      }
    }
    layoutCaption();
  };
  let bubblePosition = options.position;
  placeBubble(bubblePosition);

  const traceBubble = () => {
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    } else {
      ctx.roundRect(bubbleX, bubbleY, diameter, diameter, Math.round(diameter * ROUNDED_BUBBLE_RADIUS));
    }
  };

  const drawBubble = (webcam: VideoFrame) => {
    // A soft shadow lifts the bubble off light and dark screens alike.
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = Math.round(diameter * 0.08);
    ctx.shadowOffsetY = Math.round(diameter * 0.02);
    ctx.fillStyle = "#18181b";
    traceBubble();
    ctx.fill();
    ctx.restore();

    const { sx, sy, sw, sh } = cameraCrop(webcam.displayWidth, webcam.displayHeight, framing, mirrorWebcam);
    ctx.save();
    traceBubble();
    ctx.clip();
    if (mirrorWebcam) {
      ctx.translate(centerX * 2, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      webcam,
      sx,
      sy,
      sw,
      sh,
      centerX - radius,
      centerY - radius,
      diameter,
      diameter
    );
    ctx.restore();
  };

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

  const stackedPainter = stacked
    ? createStackedPainter(ctx, width, height, { layout: stacked, framing, mirrorWebcam })
    : null;

  const draw = (screen: VideoFrame) => {
    if (stackedPainter) {
      stackedPainter.draw(screen, webcamFrame);
      if (captionLines.length > 0) {
        drawCaption();
      }
      return;
    }
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(
      width / screen.displayWidth,
      height / screen.displayHeight
    );
    const drawWidth = screen.displayWidth * scale;
    const drawHeight = screen.displayHeight * scale;
    ctx.save();
    if (mirrorScreen) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(
      screen,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    if (webcamFrame && !bubbleHidden) {
      drawBubble(webcamFrame);
    }
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
    const frame = new VideoFrame(canvas, {
      timestamp: Math.round(performance.now() * 1000),
    });
    // The generator takes ownership of (and closes) written frames.
    writer.write(frame).catch(() => frame.close());
  });

  return {
    videoTrack: generator,
    width,
    height,
    setCaption(text: string) {
      captionText = text.trim();
      layoutCaption();
    },
    setBubblePosition(position: BubblePosition) {
      bubblePosition = position;
      placeBubble(position);
    },
    setStackedArea(area: ScreenArea) {
      stackedPainter?.setArea(area);
    },
    setBubbleSize(next: number) {
      size = next;
      placeBubble(bubblePosition);
    },
    setBubbleHidden(hidden: boolean) {
      bubbleHidden = hidden;
      placeBubble(bubblePosition);
    },
    stop() {
      if (stopped) {
        return;
      }
      stopped = true;
      stopClock();
      void screenReader.cancel().catch(() => {});
      void webcamReader?.cancel().catch(() => {});
      screenFrame?.close();
      webcamFrame?.close();
      screenFrame = null;
      webcamFrame = null;
      void writer.close().catch(() => {});
      generator.stop();
    },
  };
}
