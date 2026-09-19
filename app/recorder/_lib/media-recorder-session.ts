import {
  AUDIO_BITRATE,
  fallbackVideoBitrate,
  getMp4MimeType,
} from "@/app/recorder/_lib/recording-format";
import type {
  RecordingSession,
  RecordingSessionOptions,
} from "@/app/recorder/_lib/recording-session";

const TIMESLICE_MS = 1000;

// Browsers without WebCodecs record with MediaRecorder's built-in MP4 encoder.
export function createMediaRecorderSession({
  videoTrack,
  audio,
  resolution,
  frameRate,
  onError,
}: RecordingSessionOptions): RecordingSession {
  const mimeType = getMp4MimeType();
  if (!mimeType) {
    throw new Error("MP4 recording isn't supported in this browser.");
  }
  const recorder = new MediaRecorder(
    new MediaStream([videoTrack, ...(audio ? [audio.track] : [])]),
    {
      mimeType,
      videoBitsPerSecond: fallbackVideoBitrate(resolution, frameRate),
      audioBitsPerSecond: AUDIO_BITRATE,
    }
  );
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  recorder.onerror = onError;

  return {
    async start() {
      recorder.start(TIMESLICE_MS);
    },
    pause() {
      if (recorder.state === "recording") {
        recorder.pause();
      }
    },
    resume() {
      if (recorder.state === "paused") {
        recorder.resume();
      }
    },
    finish() {
      return new Promise((resolve) => {
        const done = () => resolve(new Blob(chunks, { type: recorder.mimeType }));
        if (recorder.state === "inactive") {
          done();
          return;
        }
        recorder.onstop = done;
        recorder.stop();
      });
    },
    async cancel() {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        recorder.stop();
      }
      chunks.length = 0;
    },
  };
}
