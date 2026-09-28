import { fitShortSide, rotatedSize, targetShortSide } from "@/app/convert/_lib/output-size";
import type { ConvertSettings, TrimRange } from "@/app/convert/_lib/types";
import {
  GIF_COLORS,
  GIF_DEFAULT_FRAME_RATE,
  GIF_DEFAULT_SHORT_SIDE,
  GIF_MAX_FRAME_RATE,
} from "@/constants/converter";

// Samples the video at a fixed frame rate and writes each frame into a looping
// GIF with its own 256-color palette. GIFs have no sound, so audio is dropped.
export async function convertToGif(
  file: Blob,
  settings: ConvertSettings,
  trim: TrimRange | null,
  onProgress: (progress: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  const [{ ALL_FORMATS, BlobSource, CanvasSink, Input }, { GIFEncoder, applyPalette, quantize }] =
    await Promise.all([import("mediabunny"), import("gifenc")]);
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) {
      throw new Error("This file has no video to turn into a GIF.");
    }

    const displaySize = rotatedSize(
      { width: await track.getDisplayWidth(), height: await track.getDisplayHeight() },
      settings.rotate
    );
    const shortSide = targetShortSide(settings.resolution, GIF_DEFAULT_SHORT_SIDE);
    const size = (shortSide !== null ? fitShortSide(displaySize, shortSide) : null) ?? displaySize;
    const frameRate =
      settings.frameRate === "original"
        ? GIF_DEFAULT_FRAME_RATE
        : Math.min(settings.frameRate, GIF_MAX_FRAME_RATE);

    const sink = new CanvasSink(track, {
      width: size.width,
      height: size.height,
      fit: "fill",
      rotation: ((track.rotation + settings.rotate) % 360) as typeof track.rotation,
      flip: settings.flip,
      poolSize: 1,
    });

    const start = trim?.start ?? 0;
    const end = trim?.end ?? (await input.computeDuration());
    const timestamps: number[] = [];
    for (let time = start; time < end; time += 1 / frameRate) {
      timestamps.push(time);
    }

    const gif = GIFEncoder();
    const delay = Math.round(1000 / frameRate);
    const colors = GIF_COLORS[settings.quality];
    let done = 0;
    for await (const frame of sink.canvasesAtTimestamps(timestamps)) {
      signal.throwIfAborted();
      done++;
      if (!frame) {
        continue;
      }
      const context = frame.canvas.getContext("2d") as
        | CanvasRenderingContext2D
        | OffscreenCanvasRenderingContext2D;
      const { data } = context.getImageData(0, 0, size.width, size.height);
      const palette = quantize(data, colors);
      gif.writeFrame(applyPalette(data, palette), size.width, size.height, { palette, delay });
      onProgress(done / timestamps.length);
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: "image/gif" });
  } finally {
    input.dispose();
  }
}
