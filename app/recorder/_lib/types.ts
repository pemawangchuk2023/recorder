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

// How screen and camera share the frame in Screen + Cam: a movable bubble
// over the screen, or stacked in a vertical 9:16 video (screen on top,
// camera below), like TikTok and CapCut reactions.
export type ScreenCameraLayout = "bubble" | "stacked";

// In the stacked layout: the whole screen over a blurred copy of itself,
// or cropped to fill its part of the frame.
export type ScreenFit = "fit" | "fill";

export interface StackedLayout {
  // Share of the frame's height given to the screen, on top.
  split: number;
  screenFit: ScreenFit;
}

// "voice" cleans up speech (echo, noise, level); "original" keeps the sound
// exactly as the mic hears it, which music and instruments need.
export type MicMode = "voice" | "original";

export type BubbleCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

// Which part of the camera picture fills the bubble. The bubble is square,
// so a widescreen camera loses its sides; this picks what's kept.
export interface CameraFraming {
  // 1 shows the camera's full height; higher zooms in on the face.
  zoom: number;
  // Centre of the kept square, 0–1 across and down, as seen on screen
  // (after mirroring).
  x: number;
  y: number;
}

export type BubbleShape = "circle" | "rounded";

// The bubble's centre as a fraction of the frame's width and height. It's
// always drawn fully inside the frame, so 0 and 1 mean "against that edge".
export interface BubblePosition {
  x: number;
  y: number;
}

export interface RecorderSettings {
  source: RecordingSource;
  resolution: Resolution;
  frameRate: FrameRate;
  codec: VideoCodecChoice;
  quality: VideoQuality;
  countdown: CountdownSeconds;
  layout: ScreenCameraLayout;
  stacked: StackedLayout;
  mic: { enabled: boolean; deviceId?: string; gain: number; mode: MicMode };
  // Sound playing on the computer, which only a shared Chrome tab (or a
  // screen, where Chrome supports it) can include.
  systemAudio: { enabled: boolean; gain: number };
  camera: {
    enabled: boolean;
    deviceId?: string;
    // Dragged in the preview, or snapped to a corner in the settings.
    position: BubblePosition;
    // Bubble diameter as a fraction of the video's height (see BUBBLE_SIZE_RANGE).
    size: number;
    shape: BubbleShape;
    // Flips the camera like a mirror, in the preview and the recording.
    mirror: boolean;
    framing: CameraFraming;
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
