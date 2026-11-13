// Finds the pauses in a recording from how loud it is over time, so they can
// be cut out in one go.

export interface Envelope {
  // Loudness (RMS, 0–1) of each window of sound, in order.
  levels: Float32Array;
  // Length of one window in seconds.
  windowSeconds: number;
}

export interface SilenceOptions {
  // Pauses shorter than this are left alone.
  minSilence: number;
  // How much quiet is left at each side of a cut, so speech isn't clipped.
  padding: number;
}

export const DEFAULT_SILENCE_OPTIONS: SilenceOptions = { minSilence: 0.8, padding: 0.15 };

function percentile(sorted: Float32Array, share: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  return sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))];
}

// The level below which a window counts as silent: well under the speaking
// level, but above the room's own hiss or hum. Null when the whole recording
// is silent (there are then no "pauses" to speak of).
export function silenceThreshold(levels: Float32Array): number | null {
  const sorted = Float32Array.from(levels).sort();
  const loud = percentile(sorted, 0.95);
  if (loud < 0.002) {
    return null;
  }
  const floor = percentile(sorted, 0.1);
  // 26 dB under the speaking level, raised to clear a noisy room, but never
  // more than a quarter of the speaking level.
  return Math.max(loud * 0.05, Math.min(floor * 2.5, loud * 0.25));
}

export function detectSilences(
  envelope: Envelope,
  duration: number,
  options: SilenceOptions = DEFAULT_SILENCE_OPTIONS
): { start: number; end: number }[] {
  const threshold = silenceThreshold(envelope.levels);
  if (threshold === null) {
    return [];
  }
  const { levels, windowSeconds } = envelope;
  const silences: { start: number; end: number }[] = [];
  let runStart = -1;
  for (let index = 0; index <= levels.length; index++) {
    const quiet = index < levels.length && levels[index] < threshold;
    if (quiet && runStart === -1) {
      runStart = index;
    } else if (!quiet && runStart !== -1) {
      const start = runStart * windowSeconds;
      const end = Math.min(duration, index * windowSeconds);
      runStart = -1;
      if (end - start < options.minSilence) {
        continue;
      }
      // Quiet is kept next to speech, but not at the very start or end of
      // the video, where there is no speech to protect.
      const cutStart = start <= windowSeconds ? 0 : start + options.padding;
      const cutEnd = end >= duration - windowSeconds ? duration : end - options.padding;
      if (cutEnd - cutStart >= 0.2) {
        silences.push({ start: cutStart, end: cutEnd });
      }
    }
  }
  return silences;
}

// Collects loudness from decoded sound, a chunk at a time.
export class EnvelopeBuilder {
  private readonly windowFrames: number;
  private readonly levels: number[] = [];
  private sum = 0;
  private count = 0;
  readonly windowSeconds: number;

  constructor(sampleRate: number, windowSeconds = 0.02) {
    this.windowFrames = Math.max(1, Math.round(sampleRate * windowSeconds));
    this.windowSeconds = this.windowFrames / sampleRate;
  }

  // One Float32Array per channel, all the same length.
  push(channels: Float32Array[]): void {
    const frames = channels[0]?.length ?? 0;
    for (let frame = 0; frame < frames; frame++) {
      let mixed = 0;
      for (const channel of channels) {
        mixed += channel[frame];
      }
      mixed /= channels.length;
      this.sum += mixed * mixed;
      if (++this.count === this.windowFrames) {
        this.levels.push(Math.sqrt(this.sum / this.count));
        this.sum = 0;
        this.count = 0;
      }
    }
  }

  finish(): Envelope {
    if (this.count > 0) {
      this.levels.push(Math.sqrt(this.sum / this.count));
      this.sum = 0;
      this.count = 0;
    }
    return { levels: Float32Array.from(this.levels), windowSeconds: this.windowSeconds };
  }
}
