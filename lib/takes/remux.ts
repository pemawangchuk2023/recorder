const loadMediabunny = () => import("mediabunny");

// Rewrites a fragmented MP4 as a regular one with its index at the front —
// the kind every player, editor and upload form expects. The video and sound
// are copied as they are, so this is fast and loses no quality.
export async function remuxToMp4(source: Blob): Promise<Blob> {
  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output } =
    await loadMediabunny();
  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  try {
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target: new BufferTarget(),
    });
    const conversion = await Conversion.init({ input, output, showWarnings: false });
    if (!conversion.isValid) {
      throw new Error("This recording can't be rewritten as an MP4.");
    }
    await conversion.execute();
    const buffer = output.target.buffer;
    if (!buffer) {
      throw new Error("Rewriting the recording produced no data.");
    }
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    input.dispose();
  }
}
