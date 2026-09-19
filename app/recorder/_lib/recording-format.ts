import type { FrameRate, Resolution } from "@/app/recorder/_lib/types";
import { isVideoCompositorSupported } from "@/app/recorder/_lib/video-compositor";

export const RESOLUTIONS: Record<Resolution, { width: number; height: number }> = {
  "720p": { width: 1280, height: 720 },
  "1080p": { width: 1920, height: 1080 },
};

// Constant-quality encoding: every frame gets the same quality, so text stays
// sharp through scrolls and scene changes, and a still screen costs almost
// nothing. On screen-like test content it held ~43 dB PSNR throughout (the old
// 8 Mbps recordings dipped to 40 dB) at about a third of the size.
export const VIDEO_QUALITY_LEVEL = "high";

// A key frame of a full screen of text costs as much as hundreds of ordinary
// frames. One every 10 s instead of every 2 s roughly halved file size, and
// seeking still lands instantly.
export const KEY_FRAME_INTERVAL_SECONDS = 10;

// Plenty for speech and tab audio.
export const AUDIO_BITRATE = 128_000;

// WebCodecs encoding needs the video compositor, which supplies frames at a
// steady rate so pausing and still screens are timed correctly.
export function canUseWebCodecs(): boolean {
  return (
    typeof VideoEncoder === "function" &&
    typeof AudioEncoder === "function" &&
    isVideoCompositorSupported()
  );
}

// Fallback for browsers without WebCodecs: MediaRecorder's built-in MP4.
// AAC plays everywhere; Opus is the fallback.
const MP4_MIME_TYPES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1.640028,opus",
];

// MediaRecorder can only aim at a bitrate, so it gets YouTube's recommended
// upload bitrates; browser defaults (~2.5 Mbps) make text look soft.
const FALLBACK_VIDEO_BITRATES: Record<Resolution, Record<FrameRate, number>> = {
  "720p": { 30: 5_000_000, 60: 7_500_000 },
  "1080p": { 30: 8_000_000, 60: 12_000_000 },
};

export function fallbackVideoBitrate(resolution: Resolution, frameRate: FrameRate): number {
  return FALLBACK_VIDEO_BITRATES[resolution][frameRate];
}

export function getMp4MimeType(): string | null {
  if (typeof MediaRecorder === "undefined") {
    return null;
  }
  return MP4_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function isRecordingSupported(): boolean {
  return window.isSecureContext && (canUseWebCodecs() || getMp4MimeType() !== null);
}

// Desktop Chrome/Edge only — phone browsers can record the camera but not the screen.
export function isScreenCaptureSupported(): boolean {
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}
