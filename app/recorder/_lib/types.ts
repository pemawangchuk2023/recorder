export type RecorderStatus = "idle" | "recording" | "paused" | "stopped";

export type RecordingSource = "screen" | "camera";

export type Resolution = "720p" | "1080p" | "1440p" | "2160p";

export type FrameRate = 30 | 60;

export type VideoCodecChoice = "avc" | "hevc";

// How much detail the encoder keeps; higher means sharper and larger files.
export type VideoQuality = "standard" | "high" | "max";

// Seconds of countdown before a take starts; 0 starts right away.
export type CountdownSeconds = 0 | 3 | 5 | 10;

// What goes into the video: Loom's three recording modes.
export type RecordingMode = "screen-camera" | "screen" | "camera";

// "voice" cleans up speech (echo, noise, level); "original" keeps the sound
// exactly as the mic hears it, which music and instruments need.
export type MicMode = "voice" | "original";

export type BubbleCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type BubbleSize = "small" | "medium" | "large";

export type BubbleShape = "circle" | "rounded";

export interface RecorderSettings {
  source: RecordingSource;
  resolution: Resolution;
  frameRate: FrameRate;
  codec: VideoCodecChoice;
  quality: VideoQuality;
  countdown: CountdownSeconds;
  mic: { enabled: boolean; deviceId?: string; gain: number; mode: MicMode };
  // Sound playing on the computer, which only a shared Chrome tab (or a
  // screen, where Chrome supports it) can include.
  systemAudio: { enabled: boolean; gain: number };
  camera: {
    enabled: boolean;
    deviceId?: string;
    corner: BubbleCorner;
    size: BubbleSize;
    shape: BubbleShape;
    // Flips the camera like a mirror, in the preview and the recording.
    mirror: boolean;
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
