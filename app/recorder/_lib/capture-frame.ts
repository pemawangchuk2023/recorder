// The frame showing in a <video>, at the video's full resolution, as a PNG —
// lossless, so text in a screen recording stays sharp.
export function captureFrame(video: HTMLVideoElement): Promise<Blob | null> {
  const { videoWidth, videoHeight } = video;
  if (!videoWidth || !videoHeight) {
    return Promise.resolve(null);
  }
  const canvas = document.createElement("canvas");
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.resolve(null);
  }
  ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
