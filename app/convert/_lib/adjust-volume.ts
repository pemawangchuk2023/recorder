import type { AudioSample } from "mediabunny";

type Mediabunny = typeof import("mediabunny");

// Returns an audio `process` step that scales every sample by `gain`, clipped
// to the valid range so boosted audio distorts rather than wraps around.
export function volumeProcessor(mediabunny: Mediabunny, gain: number) {
  return (sample: AudioSample): AudioSample => {
    const options = { planeIndex: 0, format: "f32" as const };
    const data = new Float32Array(sample.allocationSize(options) / Float32Array.BYTES_PER_ELEMENT);
    sample.copyTo(data, options);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.max(-1, Math.min(1, data[i] * gain));
    }
    const adjusted = new mediabunny.AudioSample({
      data,
      format: "f32",
      numberOfChannels: sample.numberOfChannels,
      sampleRate: sample.sampleRate,
      timestamp: sample.timestamp,
    });
    sample.close();
    return adjusted;
  };
}
