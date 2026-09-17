import type { FrameRate, Resolution } from "@/app/recorder/_lib/types";

// Chrome and Edge record H.264 MP4 natively (and pick the right H.264 level
// for the actual resolution). AAC plays everywhere; Opus is the fallback.
const MP4_MIME_TYPES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1.640028,opus",
];

export const RESOLUTIONS: Record<Resolution, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};

// YouTube's recommended upload bitrates. Browser defaults (~2.5 Mbps) make
// on-screen text look soft.
const VIDEO_BITRATES: Record<Resolution, Record<FrameRate, number>> = {
  "720p": { 30: 5_000_000, 60: 7_500_000 },
  "1080p": { 30: 8_000_000, 60: 12_000_000 },
};

export const AUDIO_BITRATE = 192_000;

export function videoBitrate(resolution: Resolution, frameRate: FrameRate): number {
  return VIDEO_BITRATES[resolution][frameRate];
}

export function getMp4MimeType(): string | null {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }
  return MP4_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function isRecordingSupported(): boolean {
  return (
    window.isSecureContext &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function" &&
    getMp4MimeType() !== null
  );
}
