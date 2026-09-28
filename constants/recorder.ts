import type { MicMode, VideoCodecChoice } from "@/app/recorder/_lib/types";

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
