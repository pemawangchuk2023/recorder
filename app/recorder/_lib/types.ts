export type RecorderStatus = "idle" | "recording" | "paused" | "stopped";

export type Resolution = "720p" | "1080p";

export type FrameRate = 30 | 60;

export type WebcamCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type WebcamSize = "small" | "medium" | "large";

export interface RecorderSettings {
  resolution: Resolution;
  frameRate: FrameRate;
  mic: { enabled: boolean; deviceId?: string; gain: number };
  systemAudio: { gain: number };
  webcam: { enabled: boolean; corner: WebcamCorner; size: WebcamSize };
  captions: { enabled: boolean };
}
