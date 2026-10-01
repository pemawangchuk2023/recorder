import {
  YOUTUBE_HD_MIN_HEIGHT,
  YOUTUBE_SHORTS_MAX_SECONDS,
  YOUTUBE_UNVERIFIED_MAX_SECONDS,
} from "@/constants/youtube";

export type CheckLevel = "pass" | "warn" | "info";

export interface CompatibilityCheck {
  label: string;
  level: CheckLevel;
  detail: string;
}

export interface VideoFacts {
  // Display name of the video codec, e.g. "H.264".
  codec: string | null;
  width: number | null;
  height: number | null;
  duration: number;
}

const WIDESCREEN = 16 / 9;

function formatCheck(codec: string | null): CompatibilityCheck {
  if (codec === "H.264") {
    return { label: "Format", level: "pass", detail: "H.264 MP4 — YouTube's recommended format." };
  }
  if (codec === "HEVC") {
    return { label: "Format", level: "pass", detail: "HEVC MP4 — YouTube accepts it; H.264 processes fastest." };
  }
  return { label: "Format", level: "info", detail: "MP4 — YouTube accepts it and converts it as needed." };
}

function qualityCheck(height: number, shortSide: number): CompatibilityCheck {
  if (shortSide >= 2160) {
    return { label: "Quality", level: "pass", detail: "4K — YouTube offers every quality up to 2160p." };
  }
  if (shortSide >= 1440) {
    return { label: "Quality", level: "pass", detail: "1440p — YouTube gives it its sharper high-bitrate processing." };
  }
  if (shortSide >= 1080) {
    return { label: "Quality", level: "pass", detail: "Full HD 1080p." };
  }
  if (shortSide >= YOUTUBE_HD_MIN_HEIGHT) {
    return { label: "Quality", level: "pass", detail: "HD 720p. Record at 1080p or higher for sharper text." };
  }
  return {
    label: "Quality",
    level: "warn",
    detail: `${height}p shows as SD on YouTube. Record at 1080p for a sharp result.`,
  };
}

function shapeCheck(width: number, height: number, duration: number): CompatibilityCheck {
  const aspect = width / height;
  if (height >= width) {
    return duration <= YOUTUBE_SHORTS_MAX_SECONDS
      ? { label: "Shape", level: "pass", detail: "Vertical and under 3 minutes — YouTube publishes it as a Short." }
      : {
          label: "Shape",
          level: "info",
          detail: "Vertical but over 3 minutes, so it's a regular video with side bars. Trim it to 3 minutes for a Short.",
        };
  }
  if (Math.abs(aspect - WIDESCREEN) < 0.02) {
    return { label: "Shape", level: "pass", detail: "16:9 widescreen — fills the YouTube player." };
  }
  return {
    label: "Shape",
    level: "info",
    detail: `${aspect.toFixed(2)}:1, not 16:9, so the player adds thin bars. Share a full screen or a 16:9 window to fill it.`,
  };
}

function lengthCheck(duration: number): CompatibilityCheck {
  if (duration > YOUTUBE_UNVERIFIED_MAX_SECONDS) {
    return {
      label: "Length",
      level: "warn",
      detail: "Over 15 minutes: the channel must be verified by phone (youtube.com/verify) to upload it.",
    };
  }
  return { label: "Length", level: "pass", detail: "Within YouTube's limits for every channel." };
}

// How a recording will fare on YouTube, worked out from the file alone.
export function checkYouTubeCompatibility({ codec, width, height, duration }: VideoFacts): CompatibilityCheck[] {
  const checks = [formatCheck(codec)];
  if (width && height) {
    checks.push(qualityCheck(height, Math.min(width, height)), shapeCheck(width, height, duration));
  }
  checks.push(lengthCheck(duration));
  return checks;
}
