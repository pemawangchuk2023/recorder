import { createMediaRecorderSession } from "@/app/recorder/_lib/media-recorder-session";
import { canEncodeCodec, createMp4Session } from "@/app/recorder/_lib/mp4-encoder";
import { VIDEO_CODECS } from "@/constants/recorder";
import type {
  FrameRate,
  Resolution,
  VideoCodecChoice,
} from "@/app/recorder/_lib/types";

// One take: encodes the given tracks into an MP4 from start() until finish().
export interface RecordingSession {
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  finish: () => Promise<Blob>;
  cancel: () => Promise<void>;
}

// The mixed microphone and tab audio: as a track for MediaRecorder, and as
// the Web Audio node it comes from for WebCodecs.
export interface RecordingAudio {
  track: MediaStreamAudioTrack;
  context: AudioContext;
  node: AudioNode;
}

export interface RecordingSessionOptions {
  videoTrack: MediaStreamVideoTrack;
  audio: RecordingAudio | null;
  codec: VideoCodecChoice;
  resolution: Resolution;
  frameRate: FrameRate;
  // Set when the video comes from the compositor at this fixed size; only
  // then is WebCodecs used.
  compositedSize: { width: number; height: number } | null;
  onError: () => void;
}

export async function createRecordingSession(
  options: RecordingSessionOptions
): Promise<{ session: RecordingSession; notice: string | null }> {
  const size = options.compositedSize;
  if (size) {
    try {
      if (await canEncodeCodec(options.codec, size, options.frameRate)) {
        return { session: await createMp4Session(options), notice: null };
      }
      if (options.codec !== "avc" && (await canEncodeCodec("avc", size, options.frameRate))) {
        return {
          session: await createMp4Session({ ...options, codec: "avc" }),
          notice: `This computer can't encode ${VIDEO_CODECS[options.codec].label} right now — recording ${VIDEO_CODECS.avc.label} instead.`,
        };
      }
    } catch {
      // For example no audio encoder for this sample rate; MediaRecorder
      // handles any input, so record with it instead.
    }
  }
  return { session: createMediaRecorderSession(options), notice: null };
}
