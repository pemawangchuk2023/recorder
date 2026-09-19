// Copies audio off Web Audio's real-time thread in ~21 ms stereo chunks.
//
// Reading a MediaStreamTrack on the page's main thread loses audio whenever
// the page is busy for more than ~100 ms (drawing video, React, captions),
// and every lost chunk is an audible click. Chunks posted from an
// AudioWorklet queue up instead of being dropped, so nothing is lost.
const CHUNK_FRAMES = 1024;
export const TAP_CHANNELS = 2;

const PROCESSOR_SOURCE = `
class RecorderTapProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(${CHUNK_FRAMES} * ${TAP_CHANNELS});
    this.filled = 0;
  }
  process(inputs) {
    const input = inputs[0];
    const frames = input.length > 0 ? input[0].length : 128;
    let offset = 0;
    while (offset < frames) {
      const count = Math.min(frames - offset, ${CHUNK_FRAMES} - this.filled);
      for (let channel = 0; channel < ${TAP_CHANNELS}; channel++) {
        const plane = input[channel] ?? input[0];
        const start = channel * ${CHUNK_FRAMES} + this.filled;
        if (plane) {
          this.buffer.set(plane.subarray(offset, offset + count), start);
        } else {
          this.buffer.fill(0, start, start + count);
        }
      }
      this.filled += count;
      offset += count;
      if (this.filled === ${CHUNK_FRAMES}) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(${CHUNK_FRAMES} * ${TAP_CHANNELS});
        this.filled = 0;
      }
    }
    return true;
  }
}
registerProcessor("recorder-tap", RecorderTapProcessor);
`;

const loadedContexts = new WeakMap<BaseAudioContext, Promise<void>>();

function loadProcessor(context: BaseAudioContext): Promise<void> {
  let loaded = loadedContexts.get(context);
  if (!loaded) {
    const url = URL.createObjectURL(new Blob([PROCESSOR_SOURCE], { type: "text/javascript" }));
    loaded = context.audioWorklet.addModule(url).finally(() => URL.revokeObjectURL(url));
    loadedContexts.set(context, loaded);
  }
  return loaded;
}

// Calls onChunk with planar float samples (all of channel 0, then channel 1)
// until the returned function is called.
export async function tapAudio(
  context: AudioContext,
  source: AudioNode,
  onChunk: (planar: Float32Array, frames: number) => void
): Promise<() => void> {
  await loadProcessor(context);
  const tap = new AudioWorkletNode(context, "recorder-tap", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    channelCount: TAP_CHANNELS,
    channelCountMode: "explicit",
    channelInterpretation: "speakers",
  });
  tap.port.onmessage = (event: MessageEvent<Float32Array>) => {
    onChunk(event.data, CHUNK_FRAMES);
  };
  source.connect(tap);
  // A node only runs while something pulls on it; its output is silent, so
  // wiring it to the speakers adds nothing audible.
  tap.connect(context.destination);
  return () => {
    tap.port.onmessage = null;
    source.disconnect(tap);
    tap.disconnect();
  };
}
