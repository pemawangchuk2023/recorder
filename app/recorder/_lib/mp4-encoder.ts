import {
  AUDIO_BITRATE,
  KEY_FRAME_INTERVAL_SECONDS,
  VIDEO_QUALITY_LEVEL,
} from "@/app/recorder/_lib/recording-format";
import type {
  RecordingSession,
  RecordingSessionOptions,
} from "@/app/recorder/_lib/recording-session";
import type { VideoCodecChoice } from "@/app/recorder/_lib/types";

// Loaded on demand so the recorder page renders without waiting for it.
const loadMediabunny = () => import("mediabunny");

const WARM_UP_TIMEOUT_MS = 6000;

export async function canEncodeCodec(
  codec: VideoCodecChoice,
  { width, height }: { width: number; height: number },
  frameRate: number
): Promise<boolean> {
  const { Quality, canEncodeVideo } = await loadMediabunny();
  return canEncodeVideo(codec, {
    width,
    height,
    frameRate,
    quality: new Quality(VIDEO_QUALITY_LEVEL),
    latencyMode: "realtime",
  }).catch(() => false);
}

// The first hardware encoder in a browser session takes seconds to start
// (~3.5 s measured on macOS). Frames arriving meanwhile are dropped, which
// froze the start of the first recording. Encoding one throwaway frame early
// pays that cost before the user presses Start; later encoders start in ms.
const warmUps = new Map<VideoCodecChoice, Promise<void>>();

async function runWarmUp(codec: VideoCodecChoice, width: number, height: number) {
  const { BufferTarget, Mp4OutputFormat, Output, Quality, VideoSample, VideoSampleSource } =
    await loadMediabunny();
  const output = new Output({ format: new Mp4OutputFormat(), target: new BufferTarget() });
  const source = new VideoSampleSource({
    codec,
    quality: new Quality(VIDEO_QUALITY_LEVEL),
    latencyMode: "realtime",
  });
  output.addVideoTrack(source);
  await output.start();
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")?.fillRect(0, 0, width, height);
  const sample = new VideoSample(canvas, { timestamp: 0, duration: 1 / 30 });
  try {
    await source.add(sample);
  } finally {
    sample.close();
  }
  await output.finalize();
}

export function warmUpEncoder(codec: VideoCodecChoice, width: number, height: number): Promise<void> {
  let warmUp = warmUps.get(codec);
  if (!warmUp) {
    warmUp = runWarmUp(codec, width, height).catch(() => {});
    warmUps.set(codec, warmUp);
  }
  // Never hold up a recording for long; a slow warm-up just costs a few frames.
  return Promise.race([
    warmUp,
    new Promise<void>((resolve) => setTimeout(resolve, WARM_UP_TIMEOUT_MS)),
  ]);
}

export async function createMp4Session({
  videoTrack,
  audioTrack,
  codec,
  frameRate,
  onError,
}: RecordingSessionOptions): Promise<RecordingSession> {
  const {
    BufferTarget,
    MediaStreamAudioTrackSource,
    MediaStreamVideoTrackSource,
    Mp4OutputFormat,
    Output,
    Quality,
    canEncodeAudio,
  } = await loadMediabunny();

  // Errors after finish() or cancel() started belong to the teardown, not the take.
  let closing = false;
  const reportError = () => {
    if (!closing) {
      onError();
    }
  };

  // fastStart puts the index at the front, so players can start instantly.
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const videoSource = new MediaStreamVideoTrackSource(
    videoTrack,
    {
      codec,
      quality: new Quality(VIDEO_QUALITY_LEVEL),
      keyFrameInterval: KEY_FRAME_INTERVAL_SECONDS,
      // "detail" keeps text sharp; "motion" keeps 60 fps smooth.
      contentHint: frameRate === 60 ? "motion" : "detail",
    },
    // The compositor already delivers frames at a steady rate; encode them
    // as they arrive instead of resampling.
    { frameRate: null }
  );
  videoSource.errorPromise.catch(reportError);
  output.addVideoTrack(videoSource);

  let audioSource: InstanceType<typeof MediaStreamAudioTrackSource> | null = null;
  if (audioTrack) {
    const audioQuality = new Quality({ bitrate: AUDIO_BITRATE });
    // AAC plays everywhere; Opus is the fallback where AAC can't be encoded.
    const audioCodec = (await canEncodeAudio("aac", { quality: audioQuality })) ? "aac" : "opus";
    audioSource = new MediaStreamAudioTrackSource(audioTrack, {
      codec: audioCodec,
      quality: audioQuality,
    });
    audioSource.errorPromise.catch(reportError);
    output.addAudioTrack(audioSource);
  }

  return {
    async start() {
      await output.start();
    },
    pause() {
      videoSource.pause();
      audioSource?.pause();
    },
    resume() {
      videoSource.resume();
      audioSource?.resume();
    },
    async finish() {
      closing = true;
      await output.finalize();
      const buffer = output.target.buffer;
      if (!buffer) {
        throw new Error("The recording produced no data.");
      }
      return new Blob([buffer], { type: "video/mp4" });
    },
    async cancel() {
      closing = true;
      if (output.state === "pending" || output.state === "started") {
        await output.cancel();
      }
    },
  };
}
