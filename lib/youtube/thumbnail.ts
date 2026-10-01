import { YOUTUBE_THUMBNAIL_MAX_BYTES, YOUTUBE_THUMBNAIL_WIDTH } from "@/constants/youtube";

const loadMediabunny = () => import("mediabunny");

const JPEG_QUALITIES = [0.92, 0.85, 0.75, 0.6];

async function toJpeg(canvas: HTMLCanvasElement | OffscreenCanvas, quality: number): Promise<Blob | null> {
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

// The frame at `time` seconds as a JPEG under YouTube's 2 MB limit, read
// straight from the file so it doesn't depend on what the player shows.
export async function thumbnailFromVideo(video: Blob, time: number): Promise<Blob | null> {
  const { ALL_FORMATS, BlobSource, CanvasSink, Input } = await loadMediabunny();
  const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) {
      return null;
    }
    // Vertical videos get a vertical thumbnail of the same height.
    const landscape = track.displayWidth >= track.displayHeight;
    const sink = new CanvasSink(
      track,
      landscape
        ? { width: Math.min(YOUTUBE_THUMBNAIL_WIDTH, track.displayWidth) }
        : { height: Math.min(YOUTUBE_THUMBNAIL_WIDTH, track.displayHeight) }
    );
    const frame = await sink.getCanvas(time);
    if (!frame) {
      return null;
    }
    for (const quality of JPEG_QUALITIES) {
      const jpeg = await toJpeg(frame.canvas, quality);
      if (jpeg && jpeg.size <= YOUTUBE_THUMBNAIL_MAX_BYTES) {
        return jpeg;
      }
    }
    return null;
  } finally {
    input.dispose();
  }
}
