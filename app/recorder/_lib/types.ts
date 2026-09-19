export type RecorderStatus = "idle" | "recording" | "paused" | "stopped";

export type RecordingSource = "screen" | "camera";

export type Resolution = "720p" | "1080p";

export type FrameRate = 30 | 60;

export type VideoCodecChoice = "avc" | "hevc";

export type BubbleCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type BubbleSize = "small" | "medium" | "large";

export interface RecorderSettings {
  source: RecordingSource;
  resolution: Resolution;
  frameRate: FrameRate;
  codec: VideoCodecChoice;
  mic: { enabled: boolean; deviceId?: string; gain: number };
  // Sound playing on the computer, which only a shared Chrome tab (or a
  // screen, where Chrome supports it) can include.
  systemAudio: { enabled: boolean; gain: number };
  camera: {
    enabled: boolean;
    deviceId?: string;
    corner: BubbleCorner;
    size: BubbleSize;
  };
  // burnIn draws the captions into the video; the transcript is kept either way.
  captions: { enabled: boolean; burnIn: boolean };
}

// A finished caption line, timed in seconds of recorded video.
export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}
