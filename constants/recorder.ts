import type {
  BubbleCorner,
  BubbleShape,
  CameraFraming,
  CountdownSeconds,
  ScreenCameraLayout,
  ScreenFit,
  FrameRate,
  MicMode,
  RecorderSettings,
  RecordingMode,
  Resolution,
  VideoCodecChoice,
  VideoQuality,
} from "@/app/recorder/_lib/types";

export const DEFAULT_FRAMING: CameraFraming = { zoom: 1, x: 0.5, y: 0.5 };

// Zooming further than this makes the camera picture visibly soft.
export const MAX_CAMERA_ZOOM = 2.5;

export const DEFAULT_SETTINGS: RecorderSettings = {
  source: "screen",
  resolution: "1080p",
  frameRate: 30,
  codec: "avc",
  quality: "high",
  countdown: 3,
  layout: "bubble",
  stacked: { split: 0.5, screenFit: "fit" },
  mic: { enabled: true, gain: 1, mode: "voice" },
  // On by default: music and video sound are only clean when captured
  // directly, never through the mic hearing the speakers.
  systemAudio: { enabled: true, gain: 1 },
  camera: {
    enabled: false,
    position: { x: 1, y: 1 },
    size: 0.38,
    shape: "circle",
    mirror: false,
    framing: DEFAULT_FRAMING,
  },
  captions: { enabled: true, burnIn: true },
};

// Settings are remembered in this browser between visits.
export const SETTINGS_STORAGE_KEY = "recorder-settings-v1";

export const RECORDING_MODES: Record<RecordingMode, { label: string; description: string }> = {
  "screen-camera": { label: "Screen + Cam", description: "Your screen and you, together in one video." },
  screen: { label: "Screen", description: "Just your screen, window or tab." },
  camera: { label: "Camera", description: "Just you, full frame." },
};

export const LAYOUT_OPTIONS: { value: ScreenCameraLayout; label: string }[] = [
  { value: "bubble", label: "Camera bubble" },
  { value: "stacked", label: "Stacked 9:16" },
];

export const LAYOUT_DESCRIPTIONS: Record<ScreenCameraLayout, string> = {
  bubble: "Your screen fills the video, with you in a movable bubble.",
  stacked:
    "A vertical video for TikTok, Reels and Shorts: what you're showing on top, you below — like a CapCut reaction.",
};

export const SCREEN_FIT_OPTIONS: { value: ScreenFit; label: string }[] = [
  { value: "fit", label: "Whole screen" },
  { value: "fill", label: "Fill" },
];

export const SCREEN_FIT_DESCRIPTIONS: Record<ScreenFit, string> = {
  fit: "Shows all of it, over a soft blurred copy — nothing is cut off.",
  fill: "Crops the sides so the screen fills its space edge to edge.",
};

// How much of the vertical frame the screen may take.
export const STACKED_SPLIT_RANGE = { min: 0.35, max: 0.7 };

export const RESOLUTION_OPTIONS: { value: Resolution; label: string }[] = [
  { value: "720p", label: "720p HD" },
  { value: "1080p", label: "1080p Full HD" },
  { value: "1440p", label: "1440p QHD" },
  { value: "2160p", label: "4K Ultra HD" },
];

export const FRAME_RATE_OPTIONS: { value: FrameRate; label: string }[] = [
  { value: 30, label: "30 fps" },
  { value: 60, label: "60 fps" },
];

export const VIDEO_QUALITIES: Record<VideoQuality, { label: string; description: string }> = {
  standard: {
    label: "Standard",
    description: "Smallest files. Good for talking and slides.",
  },
  high: {
    label: "High",
    description: "Sharp text at a modest size. The best choice for most recordings.",
  },
  max: {
    label: "Max",
    description: "Every detail kept, for fine print and design work. Files are about 1.5× larger.",
  },
};

export const COUNTDOWN_OPTIONS: { value: CountdownSeconds; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 3, label: "3 s" },
  { value: 5, label: "5 s" },
  { value: 10, label: "10 s" },
];

export const BUBBLE_CORNERS: { value: BubbleCorner; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

// Camera bubble diameter as a fraction of the video height. It can be
// resized freely in between, like Loom's; at the top it nearly fills the frame.
export const BUBBLE_SIZE_RANGE = { min: 0.12, max: 0.9 };

export const BUBBLE_SIZE_PRESETS: { value: number; label: string }[] = [
  { value: 0.22, label: "S" },
  { value: 0.3, label: "M" },
  { value: 0.38, label: "L" },
  { value: 0.5, label: "XL" },
  { value: 0.7, label: "XXL" },
];

// Distance of the bubble from the video's edges, as a fraction of its height.
export const BUBBLE_INSET_RATIO = 0.035;

// Corner radius of the rounded-square bubble, as a fraction of its size.
export const ROUNDED_BUBBLE_RADIUS = 0.24;

export const BUBBLE_SHAPES: { value: BubbleShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "rounded", label: "Rounded" },
];

export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

// Display names for the video codecs a recording may contain.
export const CODEC_NAMES: Record<string, string> = {
  avc: "H.264",
  hevc: "HEVC",
  av1: "AV1",
  vp9: "VP9",
};

export const VIDEO_CODECS: Record<VideoCodecChoice, { label: string; description: string }> = {
  avc: {
    label: CODEC_NAMES.avc,
    description: "Plays everywhere.",
  },
  hevc: {
    label: CODEC_NAMES.hevc,
    description:
      "About a third smaller. Plays on Macs, iPhones, and in Chrome and Edge; older Windows players may need the HEVC extension.",
  },
};

export const CONFIRM_TEXT: Record<"restart" | "discard", { question: string; action: string }> = {
  restart: { question: "Restart from the beginning? This take will be deleted.", action: "Restart" },
  discard: { question: "Discard this recording? It can't be recovered.", action: "Discard" },
};

export const MIC_MODES: Record<MicMode, { label: string; description: string }> = {
  voice: {
    label: "Voice",
    description:
      "Removes echo and background noise so speech is clear. Music heard through the mic gets distorted — record it with “Record computer sound” instead.",
  },
  original: {
    label: "Original sound",
    description:
      "Records exactly what the mic hears — for music, singing and instruments. Use headphones so the mic doesn't pick up your speakers.",
  },
};

// Chrome's voice processing: made for calls, it treats music as noise or echo.
export const MIC_CONSTRAINTS: Record<MicMode, MediaTrackConstraints> = {
  voice: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  original: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
};

export type LibrarySort = "newest" | "oldest" | "longest" | "largest";

export const LIBRARY_SORTS: { value: LibrarySort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "longest", label: "Longest first" },
  { value: "largest", label: "Largest first" },
];
