import type {
  BubbleCorner,
  BubbleSize,
  FrameRate,
} from "@/app/recorder/_lib/types";

export interface VideoCompositor {
  videoTrack: MediaStreamTrack;
  setCaption: (text: string) => void;
  stop: () => void;
}

interface CreateVideoCompositorOptions {
  screenTrack: MediaStreamTrack;
  webcamTrack: MediaStreamTrack | null;
  maxWidth: number;
  maxHeight: number;
  frameRate: FrameRate;
  corner: BubbleCorner;
  size: BubbleSize;
}

// Camera circle diameter as a fraction of the video height.
const WEBCAM_SIZE_RATIO: Record<BubbleSize, number> = {
  small: 0.18,
  medium: 0.25,
  large: 0.33,
};

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
  track: MediaStreamTrack,
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
  const { screenTrack, webcamTrack, frameRate, corner, size } = options;
  const { width, height } = outputSize(
    screenTrack,
    options.maxWidth,
    options.maxHeight
  );

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

  // Camera badge geometry: a circular camera on a white rounded card, matching
  // the floating bubble window.
  const diameter = Math.round(height * WEBCAM_SIZE_RATIO[size]);
  const radius = diameter / 2;
  const padding = Math.max(3, Math.round(diameter * 0.04));
  const badgeSize = diameter + padding * 2;
  const inset = Math.round(height * 0.035);
  const badgeX = corner.endsWith("left") ? inset : width - inset - badgeSize;
  const badgeY = corner.startsWith("top") ? inset : height - inset - badgeSize;
  const centerX = badgeX + badgeSize / 2;
  const centerY = badgeY + badgeSize / 2;

  // Caption geometry: centered near the bottom, kept clear of a bottom-corner
  // bubble — beside it when the frame is wide enough, above it otherwise.
  const fontSize = Math.max(16, Math.round(height * 0.042));
  const captionFont = `600 ${fontSize}px ${CAPTION_FONT_FAMILY}`;
  const lineHeight = Math.round(fontSize * 1.3);
  const paddingX = Math.round(fontSize * 0.7);
  const paddingY = Math.round(fontSize * 0.4);
  const gap = Math.round(height * 0.02);
  let captionBottom = height - Math.round(height * 0.06);
  // ~50 characters per line at most, like broadcast subtitles.
  let captionMaxWidth = Math.min(width * 0.8, fontSize * 26);
  if (webcamTrack && corner.startsWith("bottom")) {
    const clearWidth = width - 2 * (inset + badgeSize + gap);
    if (clearWidth >= width * 0.5) {
      captionMaxWidth = Math.min(captionMaxWidth, clearWidth);
    } else {
      captionBottom = badgeY - gap;
    }
  }
  let captionLines: string[] = [];
  let captionBoxWidth = 0;

  const drawBubble = (webcam: VideoFrame) => {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = Math.round(badgeSize * 0.08);
    ctx.shadowOffsetY = Math.round(badgeSize * 0.02);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, Math.round(badgeSize * 0.24));
    ctx.fill();
    ctx.restore();

    const side = Math.min(webcam.displayWidth, webcam.displayHeight);
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      webcam,
      (webcam.displayWidth - side) / 2,
      (webcam.displayHeight - side) / 2,
      side,
      side,
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

  const draw = (screen: VideoFrame) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    const scale = Math.min(
      width / screen.displayWidth,
      height / screen.displayHeight
    );
    const drawWidth = screen.displayWidth * scale;
    const drawHeight = screen.displayHeight * scale;
    ctx.drawImage(
      screen,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );

    if (webcamFrame) {
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
    setCaption(text: string) {
      const trimmed = text.trim();
      if (!trimmed) {
        captionLines = [];
        return;
      }
      ctx.font = captionFont;
      captionLines = wrapLastLines(
        ctx,
        trimmed,
        captionMaxWidth - paddingX * 2,
        CAPTION_MAX_LINES
      );
      captionBoxWidth =
        Math.max(...captionLines.map((line) => ctx.measureText(line).width)) +
        paddingX * 2;
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
