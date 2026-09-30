import { CODEC_NAMES } from "@/constants/recorder";

const loadMediabunny = () => import("mediabunny");

const THUMBNAIL_WIDTH = 640;
const THUMBNAIL_QUALITY = 0.82;
// Far enough in to skip a blank first frame, never past a short clip's middle.
const THUMBNAIL_MAX_TIME = 1.5;

export interface VideoDetails {
  duration: number;
  codec: string | null;
  width: number | null;
  height: number | null;
  thumbnail: Blob | null;
}

function canvasToJpeg(canvas: HTMLCanvasElement | OffscreenCanvas): Promise<Blob | null> {
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", THUMBNAIL_QUALITY));
  }
  return canvas.convertToBlob({ type: "image/jpeg", quality: THUMBNAIL_QUALITY });
}

// Everything the library shows about a video, read from the file itself.
export async function readVideoDetails(video: Blob): Promise<VideoDetails> {
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await loadMediabunny();
  const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
  try {
    const duration = await input.computeDuration();
    const track = await input.getPrimaryVideoTrack();
    if (!track) {
      return { duration, codec: null, width: null, height: null, thumbnail: null };
    }
    const codec = await track.getCodec();
    let thumbnail: Blob | null = null;
    try {
      if (await track.canDecode()) {
        const sink = new CanvasSink(track, { width: Math.min(THUMBNAIL_WIDTH, track.displayWidth) });
        const frame = await sink.getCanvas(Math.min(THUMBNAIL_MAX_TIME, duration / 3));
        thumbnail = frame ? await canvasToJpeg(frame.canvas) : null;
      }
    } catch {
      // A missing thumbnail only means a plain card.
    }
    return {
      duration,
      codec: codec ? (CODEC_NAMES[codec] ?? codec.toUpperCase()) : null,
      width: track.displayWidth,
      height: track.displayHeight,
      thumbnail,
    };
  } finally {
    input.dispose();
  }
}
