export type OutputFormatId =
  | "mp4"
  | "webm"
  | "mov"
  | "mkv"
  | "gif"
  | "mp3"
  | "m4a"
  | "wav"
  | "ogg"
  | "flac"
  | "aac";

export type OutputKind = "video" | "audio" | "image";

export type QualityChoice = "very-low" | "low" | "medium" | "high" | "very-high";

// Shorter side of the output picture, e.g. 720 for 1280×720 or a 720×1280 phone video.
export type ResolutionChoice = "original" | 2160 | 1440 | 1080 | 720 | 480 | 360 | 240;

export type FrameRateChoice = "original" | 60 | 30 | 24 | 15 | 10;

export type RotationChoice = 0 | 90 | 180 | 270;

export type ChannelChoice = "original" | 2 | 1;

export type SampleRateChoice = "original" | 48000 | 44100 | 22050;

export interface ConvertSettings {
  format: OutputFormatId;
  quality: QualityChoice;
  resolution: ResolutionChoice;
  frameRate: FrameRateChoice;
  rotate: RotationChoice;
  flip: boolean;
  removeAudio: boolean;
  channels: ChannelChoice;
  sampleRate: SampleRateChoice;
  // Percent; 100 leaves the audio untouched.
  volume: number;
}

export interface TrimRange {
  start: number;
  end: number;
}

export interface MediaInfo {
  duration: number;
  container: string;
  video: { codec: string | null; width: number; height: number } | null;
  audio: { codec: string | null; sampleRate: number; channels: number } | null;
}

export interface ConvertedFile {
  blob: Blob;
  filename: string;
}

export type JobStatus = "reading" | "ready" | "converting" | "done" | "error" | "cancelled";

export interface ConvertJob {
  id: string;
  file: File;
  info: MediaInfo | null;
  trim: TrimRange | null;
  status: JobStatus;
  progress: number;
  result: ConvertedFile | null;
  error: string | null;
}
