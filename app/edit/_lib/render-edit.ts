import type { AudioSample, VideoSample } from "mediabunny";
import { drawAnnotations } from "@/app/edit/_lib/draw-annotations";
import {
  annotationsAt,
  cropPixels,
  keptRanges,
  type EditPlan,
  type TimeRange,
} from "@/app/edit/_lib/edit-plan";
import { EnvelopeBuilder, type Envelope } from "@/app/edit/_lib/silence";
import { TimeStretcher } from "@/app/edit/_lib/time-stretch";

const loadMediabunny = () => import("mediabunny");

// A key frame every few seconds keeps seeking quick in the saved video.
const KEY_FRAME_INTERVAL_SECONDS = 5;
const AUDIO_BITRATE = 192_000;
// Sound fades over this long at each join, so a cut never clicks.
const JOIN_FADE_SECONDS = 0.006;
// Sped-up video doesn't need more frames per second than this.
const MAX_FRAME_RATE = 60;
const AUDIO_CHUNK_FRAMES = 4096;

export function canRenderEdits(): boolean {
  return (
    typeof VideoEncoder === "function" &&
    typeof VideoDecoder === "function" &&
    typeof OffscreenCanvas === "function"
  );
}

function planes(sample: AudioSample, from: number, to: number): Float32Array[] {
  const count = to - from;
  return Array.from({ length: sample.numberOfChannels }, (_, planeIndex) => {
    const plane = new Float32Array(count);
    if (count > 0) {
      sample.copyTo(plane, { planeIndex, format: "f32-planar", frameOffset: from, frameCount: count });
    }
    return plane;
  });
}

// Loudness over the whole recording, for the waveform and for finding
// pauses. Null when the recording has no sound track that can be read.
export async function readEnvelope(
  video: Blob,
  onProgress: (progress: number) => void,
  signal: AbortSignal
): Promise<Envelope | null> {
  const { ALL_FORMATS, AudioSampleSink, BlobSource, Input } = await loadMediabunny();
  const input = new Input({ source: new BlobSource(video), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track || !(await track.canDecode())) {
      return null;
    }
    const duration = await input.computeDuration();
    const builder = new EnvelopeBuilder(track.sampleRate);
    const sink = new AudioSampleSink(track);
    let lastReport = 0;
    for await (const sample of sink.samples()) {
      try {
        signal.throwIfAborted();
        builder.push(planes(sample, 0, sample.numberOfFrames));
        if (sample.timestamp - lastReport > 5) {
          lastReport = sample.timestamp;
          onProgress(Math.min(1, sample.timestamp / duration));
        }
      } finally {
        sample.close();
      }
    }
    return builder.finish();
  } finally {
    input.dispose();
  }
}

export interface RenderResult {
  video: Blob;
  width: number;
  height: number;
}

// Builds the edited video: the kept parts joined together, cropped, at the
// chosen speed, with the annotations drawn in. Everything is decoded and
// encoded on this device.
export async function renderEdit(
  source: Blob,
  plan: EditPlan,
  onProgress: (progress: number) => void,
  signal: AbortSignal
): Promise<RenderResult> {
  const mediabunny = await loadMediabunny();
  const {
    ALL_FORMATS,
    AudioSample: OutputAudioSample,
    AudioSampleSink,
    AudioSampleSource,
    BlobSource,
    BufferTarget,
    Input,
    Mp4OutputFormat,
    Output,
    QUALITY_HIGH,
    VideoSample: OutputVideoSample,
    VideoSampleSink,
    VideoSampleSource,
    canEncodeAudio,
    canEncodeVideo,
  } = mediabunny;

  const input = new Input({ source: new BlobSource(source), formats: ALL_FORMATS });
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });
  let started = false;
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack || !(await videoTrack.canDecode())) {
      throw new Error("This browser can't read this recording's video.");
    }
    const duration = await input.computeDuration();
    const kept = keptRanges(plan.cuts, duration);
    const totalSeconds = kept.reduce((total, range) => total + range.end - range.start, 0) / plan.speed;
    if (kept.length === 0 || totalSeconds <= 0) {
      throw new Error("Nothing is left of the video after these cuts.");
    }

    const frameWidth = videoTrack.displayWidth;
    const frameHeight = videoTrack.displayHeight;
    const crop = cropPixels(plan.crop, frameWidth, frameHeight);
    const canvas = new OffscreenCanvas(crop.width, crop.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      throw new Error("This browser can't draw video frames.");
    }
    // The original frame, positioned so the crop fills the canvas.
    const frame = { x: -crop.left, y: -crop.top, width: frameWidth, height: frameHeight };

    const sourceCodec = await videoTrack.getCodec();
    const size = { width: crop.width, height: crop.height, bitrate: QUALITY_HIGH };
    const videoCodec =
      (sourceCodec === "avc" || sourceCodec === "hevc") && (await canEncodeVideo(sourceCodec, size).catch(() => false))
        ? sourceCodec
        : (await canEncodeVideo("avc", size).catch(() => false))
          ? "avc"
          : null;
    if (!videoCodec) {
      throw new Error("This browser can't encode video at this size. Try a smaller crop, or Chrome or Edge.");
    }
    const videoSource = new VideoSampleSource({
      codec: videoCodec,
      bitrate: QUALITY_HIGH,
      keyFrameInterval: KEY_FRAME_INTERVAL_SECONDS,
    });
    output.addVideoTrack(videoSource);

    const audioTrack = await input.getPrimaryAudioTrack();
    const readsAudio = audioTrack !== null && (await audioTrack.canDecode());
    let audioSource: InstanceType<typeof AudioSampleSource> | null = null;
    if (audioTrack && readsAudio) {
      const options = {
        bitrate: AUDIO_BITRATE,
        numberOfChannels: audioTrack.numberOfChannels,
        sampleRate: audioTrack.sampleRate,
      };
      const audioCodec = (await canEncodeAudio("aac", options).catch(() => false))
        ? "aac"
        : (await canEncodeAudio("opus", options).catch(() => false))
          ? "opus"
          : null;
      if (audioCodec) {
        audioSource = new AudioSampleSource({ codec: audioCodec, bitrate: AUDIO_BITRATE });
        output.addAudioTrack(audioSource);
      }
    }

    await output.start();
    started = true;

    // --- Picture: every kept frame, redrawn and re-timed. ---
    const writeVideo = async () => {
      const sink = new VideoSampleSink(videoTrack);
      const minGap = 1 / MAX_FRAME_RATE - 0.002;
      let keptBefore = 0;
      let lastWritten = -Infinity;
      // A frame waits here until the next one says how long it lasts.
      let pending: { sample: VideoSample; time: number; sourceTime: number } | null = null;

      const write = async (next: { sample: VideoSample; time: number; sourceTime: number }, until: number) => {
        try {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, crop.width, crop.height);
          next.sample.draw(ctx, frame.x, frame.y, frame.width, frame.height);
          const active = annotationsAt(plan.annotations, next.sourceTime);
          if (active.length > 0) {
            drawAnnotations(ctx, active, frame, { image: canvas, ...frame });
          }
          const rendered = new OutputVideoSample(canvas, {
            timestamp: next.time,
            duration: Math.max(until - next.time, 1 / 1000),
          });
          try {
            await videoSource.add(rendered);
          } finally {
            rendered.close();
          }
        } finally {
          next.sample.close();
        }
        onProgress(Math.min(0.99, next.time / totalSeconds));
      };

      try {
        for (const range of kept) {
          for await (const sample of sink.samples(range.start, range.end)) {
            signal.throwIfAborted();
            // The first frame of a part may have begun just before it.
            const sourceTime = Math.min(Math.max(sample.timestamp, range.start), range.end);
            const time = (keptBefore + sourceTime - range.start) / plan.speed;
            if (time - lastWritten < minGap) {
              sample.close();
              continue;
            }
            if (pending) {
              const ready = pending;
              pending = null;
              await write(ready, time);
            }
            pending = { sample, time, sourceTime };
            lastWritten = time;
          }
          keptBefore += range.end - range.start;
        }
        if (pending) {
          const ready = pending;
          pending = null;
          await write(ready, totalSeconds);
        }
      } finally {
        pending?.sample.close();
      }
    };

    // --- Sound: the same parts, joined with tiny fades, at the same speed. ---
    const writeAudio = async () => {
      if (!audioTrack || !audioSource) {
        return;
      }
      const target = audioSource;
      const { sampleRate, numberOfChannels } = audioTrack;
      const sink = new AudioSampleSink(audioTrack);
      const stretcher = plan.speed === 1 ? null : new TimeStretcher(numberOfChannels, sampleRate, plan.speed);
      const fadeFrames = Math.max(1, Math.round(JOIN_FADE_SECONDS * sampleRate));
      let framesWritten = 0;

      const emit = async (channels: Float32Array[]) => {
        const total = channels[0]?.length ?? 0;
        for (let offset = 0; offset < total; offset += AUDIO_CHUNK_FRAMES) {
          const count = Math.min(AUDIO_CHUNK_FRAMES, total - offset);
          const data = new Float32Array(count * numberOfChannels);
          channels.forEach((channel, index) => data.set(channel.subarray(offset, offset + count), index * count));
          const sample = new OutputAudioSample({
            data,
            format: "f32-planar",
            numberOfChannels,
            sampleRate,
            timestamp: framesWritten / sampleRate,
          });
          framesWritten += count;
          try {
            await target.add(sample);
          } finally {
            sample.close();
          }
        }
      };

      for (const range of kept) {
        const fadesIn = range.start > 0;
        const fadesOut = range.end < duration;
        for await (const sample of sink.samples(range.start, range.end)) {
          let channels: Float32Array[];
          let firstFrameTime: number;
          try {
            signal.throwIfAborted();
            const from = Math.min(sample.numberOfFrames, Math.max(0, Math.round((range.start - sample.timestamp) * sampleRate)));
            const to = Math.min(sample.numberOfFrames, Math.max(from, Math.round((range.end - sample.timestamp) * sampleRate)));
            channels = planes(sample, from, to);
            firstFrameTime = sample.timestamp + from / sampleRate;
          } finally {
            sample.close();
          }
          const count = channels[0]?.length ?? 0;
          if (count === 0) {
            continue;
          }
          // Frames since this part began, and until it ends.
          const sinceStart = Math.round((firstFrameTime - range.start) * sampleRate);
          const untilEnd = Math.round((range.end - firstFrameTime) * sampleRate);
          if ((fadesIn && sinceStart < fadeFrames) || (fadesOut && untilEnd - count < fadeFrames)) {
            for (let index = 0; index < count; index++) {
              let gain = 1;
              if (fadesIn) {
                gain = Math.min(gain, (sinceStart + index) / fadeFrames);
              }
              if (fadesOut) {
                gain = Math.min(gain, (untilEnd - index) / fadeFrames);
              }
              if (gain < 1) {
                const clamped = Math.max(0, gain);
                channels.forEach((channel) => {
                  channel[index] *= clamped;
                });
              }
            }
          }
          await emit(stretcher ? stretcher.push(channels) : channels);
        }
      }
      if (stretcher) {
        await emit(stretcher.flush());
      }
    };

    // Side by side, so neither track gets far ahead of the other in the file.
    await Promise.all([writeVideo(), writeAudio()]);
    signal.throwIfAborted();
    await output.finalize();
    const buffer = output.target.buffer;
    if (!buffer) {
      throw new Error("Saving the edit produced no data.");
    }
    onProgress(1);
    return { video: new Blob([buffer], { type: "video/mp4" }), width: crop.width, height: crop.height };
  } catch (cause) {
    if (started && (output.state === "started" || output.state === "pending")) {
      await output.cancel().catch(() => {});
    }
    throw cause;
  } finally {
    input.dispose();
  }
}

// How much of the kept video a list of ranges adds up to, for summaries.
export function totalSeconds(ranges: TimeRange[]): number {
  return ranges.reduce((total, range) => total + range.end - range.start, 0);
}
