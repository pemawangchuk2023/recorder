import type {
  ChannelChoice,
  ConvertSettings,
  FrameRateChoice,
  OutputFormatId,
  OutputKind,
  QualityChoice,
  ResolutionChoice,
  RotationChoice,
  SampleRateChoice,
} from "@/app/convert/_lib/types";

export interface OutputFormatInfo {
  label: string;
  extension: string;
  mimeType: string;
  kind: OutputKind;
  description: string;
}

export const OUTPUT_FORMATS: Record<OutputFormatId, OutputFormatInfo> = {
  mp4: { label: "MP4", extension: "mp4", mimeType: "video/mp4", kind: "video", description: "Plays everywhere." },
  webm: { label: "WebM", extension: "webm", mimeType: "video/webm", kind: "video", description: "Small, open format for the web." },
  mov: { label: "MOV", extension: "mov", mimeType: "video/quicktime", kind: "video", description: "QuickTime, for Final Cut and iMovie." },
  mkv: { label: "MKV", extension: "mkv", mimeType: "video/x-matroska", kind: "video", description: "Flexible container for any codec." },
  gif: { label: "GIF", extension: "gif", mimeType: "image/gif", kind: "image", description: "Silent looping animation for chats and docs." },
  mp3: { label: "MP3", extension: "mp3", mimeType: "audio/mpeg", kind: "audio", description: "Audio that plays everywhere." },
  m4a: { label: "M4A", extension: "m4a", mimeType: "audio/mp4", kind: "audio", description: "AAC audio, great for Apple devices." },
  wav: { label: "WAV", extension: "wav", mimeType: "audio/wav", kind: "audio", description: "Uncompressed audio for editing." },
  ogg: { label: "OGG", extension: "ogg", mimeType: "audio/ogg", kind: "audio", description: "Opus audio, tiny files." },
  flac: { label: "FLAC", extension: "flac", mimeType: "audio/flac", kind: "audio", description: "Lossless compressed audio." },
  aac: { label: "AAC", extension: "aac", mimeType: "audio/aac", kind: "audio", description: "Raw AAC audio stream." },
};

export const FORMAT_GROUPS: { kind: OutputKind; label: string; formats: OutputFormatId[] }[] = [
  { kind: "video", label: "Video", formats: ["mp4", "webm", "mov", "mkv"] },
  { kind: "image", label: "Animation", formats: ["gif"] },
  { kind: "audio", label: "Audio only", formats: ["mp3", "m4a", "wav", "ogg", "flac", "aac"] },
];

export const QUALITY_OPTIONS: { value: QualityChoice; label: string }[] = [
  { value: "very-high", label: "Very high (largest)" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "very-low", label: "Very low (smallest)" },
];

export const RESOLUTION_OPTIONS: { value: ResolutionChoice; label: string }[] = [
  { value: "original", label: "Same as source" },
  { value: 2160, label: "4K (2160p)" },
  { value: 1440, label: "1440p" },
  { value: 1080, label: "1080p" },
  { value: 720, label: "720p" },
  { value: 480, label: "480p" },
  { value: 360, label: "360p" },
  { value: 240, label: "240p" },
];

export const FRAME_RATE_OPTIONS: { value: FrameRateChoice; label: string }[] = [
  { value: "original", label: "Same as source" },
  { value: 60, label: "60 fps" },
  { value: 30, label: "30 fps" },
  { value: 24, label: "24 fps" },
  { value: 15, label: "15 fps" },
  { value: 10, label: "10 fps" },
];

export const ROTATION_OPTIONS: { value: RotationChoice; label: string }[] = [
  { value: 0, label: "None" },
  { value: 90, label: "90° right" },
  { value: 180, label: "180°" },
  { value: 270, label: "90° left" },
];

export const CHANNEL_OPTIONS: { value: ChannelChoice; label: string }[] = [
  { value: "original", label: "Same as source" },
  { value: 2, label: "Stereo" },
  { value: 1, label: "Mono" },
];

export const SAMPLE_RATE_OPTIONS: { value: SampleRateChoice; label: string }[] = [
  { value: "original", label: "Same as source" },
  { value: 48000, label: "48 kHz" },
  { value: 44100, label: "44.1 kHz" },
  { value: 22050, label: "22.05 kHz (voice)" },
];

export const VOLUME_RANGE = { min: 0, max: 300, step: 10 };

export const DEFAULT_CONVERT_SETTINGS: ConvertSettings = {
  format: "mp4",
  quality: "high",
  resolution: "original",
  frameRate: "original",
  rotate: 0,
  flip: false,
  removeAudio: false,
  channels: "original",
  sampleRate: "original",
  volume: 100,
};

// GIFs grow fast: frames are stored nearly uncompressed. Unless a size and
// frame rate are picked, they're kept at a size that's fine for chats and docs.
export const GIF_DEFAULT_SHORT_SIDE = 480;
export const GIF_DEFAULT_FRAME_RATE = 12;
export const GIF_MAX_FRAME_RATE = 30;

// Colors per GIF frame for each quality; fewer colors make smaller files.
export const GIF_COLORS: Record<QualityChoice, number> = {
  "very-high": 256,
  high: 256,
  medium: 128,
  low: 64,
  "very-low": 32,
};

// What the file picker offers; anything else is still tried if it's dropped.
export const ACCEPTED_FILES = "video/*,audio/*,.mkv,.mov,.m4a,.flac,.ogg,.opus,.aac,.ts";
