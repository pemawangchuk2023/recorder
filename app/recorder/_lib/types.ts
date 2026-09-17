export type RecorderStatus = "idle" | "recording" | "paused" | "stopped";

export type RecordingSource = "screen" | "camera";

export type Resolution = "720p" | "1080p";

export type FrameRate = 30 | 60;

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
  mic: { enabled: boolean; deviceId?: string; gain: number };
  systemAudio: { gain: number };
  camera: {
    enabled: boolean;
    deviceId?: string;
    corner: BubbleCorner;
    size: BubbleSize;
  };
  captions: { enabled: boolean };
}
