import { KEY_FRAME_INTERVAL_SECONDS } from "@/app/recorder/_lib/recording-format";
import { CODEC_NAMES } from "@/constants/recorder";

const loadMediabunny = () => import("mediabunny");

export interface RecordingInfo {
  duration: number;
  // Display name of the video codec, e.g. "H.264".
  codec: string | null;
}

// Read from the file itself: <video>.duration is Infinity for MediaRecorder's
// fragmented MP4s.
export async function readRecordingInfo(blob: Blob): Promise<RecordingInfo> {
  const { ALL_FORMATS, BlobSource, Input } = await loadMediabunny();
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    const codec = track ? await track.getCodec() : null;
    return {
      duration: await input.computeDuration(),
      codec: codec ? (CODEC_NAMES[codec] ?? codec.toUpperCase()) : null,
    };
  } finally {
    input.dispose();
  }
}

export function canTrimRecordings(): boolean {
  return typeof VideoEncoder === "function" && typeof VideoDecoder === "function";
}

// Cuts the recording to [start, end] seconds. Cutting only the end copies the
// video as-is (instant, lossless); cutting the start re-encodes it, since the
// new first frame must become a key frame.
export async function trimRecording(
  blob: Blob,
  start: number,
  end: number,
  onProgress: (progress: number) => void
): Promise<Blob> {
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } =
    await loadMediabunny();
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    const codec = track ? await track.getCodec() : null;
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });
    const conversion = await Conversion.init({
      input,
      output,
      trim: { start, end },
      // When re-encoding, keep the recording's codec and its sparse key frames
      // so the trimmed file stays as small as the original.
      video:
        start > 0 && codec
          ? { codec, keyFrameInterval: KEY_FRAME_INTERVAL_SECONDS }
          : undefined,
      showWarnings: false,
    });
    if (!conversion.isValid) {
      throw new Error("This recording can't be trimmed.");
    }
    conversion.onProgress = onProgress;
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer) {
      throw new Error("Trimming produced no data.");
    }
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    input.dispose();
  }
}
