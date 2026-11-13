// Changes how fast sound plays without changing its pitch, so a sped-up
// voice keeps sounding like the same person.
//
// The method (WSOLA) cuts the sound into short overlapping windows and lays
// them down closer together (faster) or further apart (slower). Each window
// is nudged a few milliseconds to where it lines up best with the sound
// already laid down, which is what keeps the result free of warbling.

const WINDOW_SECONDS = 0.03;
const SEARCH_SECONDS = 0.008;
// The alignment search compares every 4th sample at every 2nd position:
// plenty for speech, and 8× less work.
const COMPARE_STEP = 4;
const POSITION_STEP = 2;

export class TimeStretcher {
  private readonly channels: number;
  private readonly speed: number;
  private readonly windowFrames: number;
  private readonly hop: number;
  private readonly search: number;
  private readonly window: Float32Array;

  // Input not yet finished with, and the position of its first frame.
  private input: Float32Array[];
  private mono: Float32Array;
  private inputBase = 0;
  private inputLength = 0;
  private totalIn = 0;

  // Second half of the last window laid down, waiting for the next one.
  private tail: Float32Array[];
  private frameIndex = 0;
  private lastPosition = 0;
  private emitted = 0;

  constructor(channels: number, sampleRate: number, speed: number) {
    this.channels = channels;
    this.speed = speed;
    this.windowFrames = Math.max(64, Math.round((sampleRate * WINDOW_SECONDS) / 2) * 2);
    this.hop = this.windowFrames / 2;
    this.search = Math.max(8, Math.round(sampleRate * SEARCH_SECONDS));
    this.window = new Float32Array(this.windowFrames);
    for (let index = 0; index < this.windowFrames; index++) {
      this.window[index] = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / this.windowFrames);
    }
    this.input = Array.from({ length: channels }, () => new Float32Array(this.windowFrames * 8));
    this.mono = new Float32Array(this.windowFrames * 8);
    this.tail = Array.from({ length: channels }, () => new Float32Array(this.hop));
  }

  // Takes one Float32Array per channel; returns whatever output is ready.
  push(chunk: Float32Array[]): Float32Array[] {
    this.append(chunk);
    return this.process(false);
  }

  // Returns the rest of the output. The total length is the input's length
  // divided by the speed, to the sample.
  flush(): Float32Array[] {
    const target = Math.round(this.totalIn / this.speed);
    // Silence after the end lets the last windows be laid down in full.
    const realLength = this.totalIn;
    this.append(
      Array.from({ length: this.channels }, () => new Float32Array(this.windowFrames * 2 + this.search * 2))
    );
    this.totalIn = realLength;
    const emittedBefore = this.emitted;
    const rest = this.process(true);
    const wanted = Math.max(0, target - emittedBefore);
    this.emitted = target;
    return rest.map((channel) => {
      if (channel.length >= wanted) {
        return channel.subarray(0, wanted);
      }
      const padded = new Float32Array(wanted);
      padded.set(channel);
      return padded;
    });
  }

  private append(chunk: Float32Array[]): void {
    const frames = chunk[0]?.length ?? 0;
    if (frames === 0) {
      return;
    }
    const needed = this.inputLength + frames;
    if (needed > this.mono.length) {
      const capacity = Math.max(needed, this.mono.length * 2);
      this.input = this.input.map((channel) => {
        const grown = new Float32Array(capacity);
        grown.set(channel.subarray(0, this.inputLength));
        return grown;
      });
      const grownMono = new Float32Array(capacity);
      grownMono.set(this.mono.subarray(0, this.inputLength));
      this.mono = grownMono;
    }
    for (let channel = 0; channel < this.channels; channel++) {
      this.input[channel].set(chunk[channel] ?? chunk[0], this.inputLength);
    }
    for (let frame = 0; frame < frames; frame++) {
      let mixed = 0;
      for (let channel = 0; channel < this.channels; channel++) {
        mixed += (chunk[channel] ?? chunk[0])[frame];
      }
      this.mono[this.inputLength + frame] = mixed;
    }
    this.inputLength += frames;
    this.totalIn += frames;
  }

  // Where the next window is best taken from, near `ideal`: the place that
  // looks most like what would naturally have followed the last window.
  private bestPosition(ideal: number): number {
    if (this.frameIndex === 0) {
      return 0;
    }
    const natural = this.lastPosition + this.hop - this.inputBase;
    const first = Math.max(0, ideal - this.search) - this.inputBase;
    const last = ideal + this.search - this.inputBase;
    let best = Math.max(0, ideal - this.inputBase);
    let bestScore = -Infinity;
    for (let candidate = first; candidate <= last; candidate += POSITION_STEP) {
      let score = 0;
      for (let offset = 0; offset < this.windowFrames; offset += COMPARE_STEP) {
        score += this.mono[natural + offset] * this.mono[candidate + offset];
      }
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }
    return best + this.inputBase;
  }

  private process(finishing: boolean): Float32Array[] {
    const blocks: Float32Array[][] = [];
    for (;;) {
      const ideal = Math.round(this.frameIndex * this.hop * this.speed);
      if (finishing && ideal >= this.totalIn) {
        break;
      }
      const natural = this.lastPosition + this.hop;
      const needed = Math.max(ideal + this.search, natural) + this.windowFrames;
      if (needed > this.inputBase + this.inputLength) {
        break;
      }
      const position = this.bestPosition(ideal);
      const local = position - this.inputBase;
      const block: Float32Array[] = [];
      for (let channel = 0; channel < this.channels; channel++) {
        const source = this.input[channel];
        const tail = this.tail[channel];
        const out = new Float32Array(this.hop);
        for (let index = 0; index < this.hop; index++) {
          // The very first window has nothing before it to fade in over.
          const gain = this.frameIndex === 0 ? 1 : this.window[index];
          out[index] = tail[index] + source[local + index] * gain;
          tail[index] = source[local + this.hop + index] * this.window[this.hop + index];
        }
        block.push(out);
      }
      blocks.push(block);
      this.lastPosition = position;
      this.frameIndex++;
      const nextIdeal = Math.round(this.frameIndex * this.hop * this.speed);
      this.discardBefore(Math.min(position + this.hop, nextIdeal - this.search));
    }
    const length = blocks.length * this.hop;
    this.emitted += length;
    return Array.from({ length: this.channels }, (_, channel) => {
      const joined = new Float32Array(length);
      blocks.forEach((block, index) => joined.set(block[channel], index * this.hop));
      return joined;
    });
  }

  private discardBefore(position: number): void {
    const drop = Math.min(this.inputLength, Math.max(0, position - this.inputBase));
    // Moving memory is only worth it for a decent amount.
    if (drop < this.windowFrames * 4) {
      return;
    }
    for (const channel of this.input) {
      channel.copyWithin(0, drop, this.inputLength);
    }
    this.mono.copyWithin(0, drop, this.inputLength);
    this.inputBase += drop;
    this.inputLength -= drop;
  }
}
