function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2);
}

// A wide recording's size, turned on its side: 1920×1080 becomes 1080×1920.
export function tiktokFrameSize(width: number, height: number): { width: number; height: number } {
  return { width: even(height), height: even(width) };
}

// Makes a vertical 9:16 copy of a finished recording, in this tab. The whole
// picture is kept, never stretched, so a wide one has black above and below.
export async function convertToTikTokSize(
  blob: Blob,
  size: { width: number; height: number },
  onProgress: (progress: number) => void,
  signal: AbortSignal
): Promise<Blob> {
  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    Conversion,
    ConversionCanceledError,
    Input,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
    canEncodeVideo,
  } = await import("mediabunny");
  if (!(await canEncodeVideo("avc", { ...size, quality: QUALITY_HIGH }))) {
    throw new Error("This browser can't make a TikTok size video.");
  }

  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      video: { codec: "avc", quality: QUALITY_HIGH, ...size, fit: "contain", forceTranscode: true },
      showWarnings: false,
    });
    if (!conversion.isValid) {
      throw new Error("This recording can't be made into a TikTok size video.");
    }

    const cancel = () => void conversion.cancel();
    signal.addEventListener("abort", cancel, { once: true });
    conversion.onProgress = onProgress;
    try {
      await conversion.execute();
    } catch (cause) {
      if (cause instanceof ConversionCanceledError) {
        signal.throwIfAborted();
      }
      throw cause;
    } finally {
      signal.removeEventListener("abort", cancel);
    }

    const buffer = output.target.buffer;
    if (!buffer) {
      throw new Error("The conversion produced no data.");
    }
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    input.dispose();
  }
}
