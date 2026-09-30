import { RESOLUTIONS } from "@/app/recorder/_lib/recording-format";
import type { RecorderSettings } from "@/app/recorder/_lib/types";
import {
  BUBBLE_CORNERS,
  BUBBLE_SHAPES,
  BUBBLE_SIZES,
  COUNTDOWN_OPTIONS,
  DEFAULT_SETTINGS,
  FRAME_RATE_OPTIONS,
  MIC_MODES,
  SETTINGS_STORAGE_KEY,
  VIDEO_CODECS,
  VIDEO_QUALITIES,
} from "@/constants/recorder";

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function volume(value: unknown, fallback: number): number {
  return typeof value === "number" && value >= 0 && value <= 1 ? value : fallback;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

type Stored = Partial<{ [K in keyof RecorderSettings]: Record<string, unknown> | unknown }>;

// Saved settings may come from an older version of the page, so every field
// is checked and anything unknown falls back to the default.
export function parseSettings(raw: string | null): RecorderSettings {
  if (!raw) {
    return DEFAULT_SETTINGS;
  }
  let stored: Stored;
  try {
    stored = JSON.parse(raw) as Stored;
  } catch {
    return DEFAULT_SETTINGS;
  }
  const d = DEFAULT_SETTINGS;
  const mic = (stored.mic ?? {}) as Record<string, unknown>;
  const systemAudio = (stored.systemAudio ?? {}) as Record<string, unknown>;
  const camera = (stored.camera ?? {}) as Record<string, unknown>;
  const captions = (stored.captions ?? {}) as Record<string, unknown>;
  const values = <T>(options: readonly { value: T }[]) => options.map((option) => option.value);

  return {
    source: oneOf(stored.source, ["screen", "camera"] as const, d.source),
    resolution: oneOf(stored.resolution, Object.keys(RESOLUTIONS) as (keyof typeof RESOLUTIONS)[], d.resolution),
    frameRate: oneOf(stored.frameRate, values(FRAME_RATE_OPTIONS), d.frameRate),
    codec: oneOf(stored.codec, Object.keys(VIDEO_CODECS) as (keyof typeof VIDEO_CODECS)[], d.codec),
    quality: oneOf(stored.quality, Object.keys(VIDEO_QUALITIES) as (keyof typeof VIDEO_QUALITIES)[], d.quality),
    countdown: oneOf(stored.countdown, values(COUNTDOWN_OPTIONS), d.countdown),
    mic: {
      enabled: typeof mic.enabled === "boolean" ? mic.enabled : d.mic.enabled,
      deviceId: optionalString(mic.deviceId),
      gain: volume(mic.gain, d.mic.gain),
      mode: oneOf(mic.mode, Object.keys(MIC_MODES) as (keyof typeof MIC_MODES)[], d.mic.mode),
    },
    systemAudio: {
      enabled: typeof systemAudio.enabled === "boolean" ? systemAudio.enabled : d.systemAudio.enabled,
      gain: volume(systemAudio.gain, d.systemAudio.gain),
    },
    camera: {
      // The floating bubble can't reopen without a click; the Camera section
      // offers a button for it.
      enabled: typeof camera.enabled === "boolean" ? camera.enabled : d.camera.enabled,
      deviceId: optionalString(camera.deviceId),
      corner: oneOf(camera.corner, values(BUBBLE_CORNERS), d.camera.corner),
      size: oneOf(camera.size, values(BUBBLE_SIZES), d.camera.size),
      shape: oneOf(camera.shape, values(BUBBLE_SHAPES), d.camera.shape),
      mirror: typeof camera.mirror === "boolean" ? camera.mirror : d.camera.mirror,
    },
    captions: {
      enabled: typeof captions.enabled === "boolean" ? captions.enabled : d.captions.enabled,
      burnIn: typeof captions.burnIn === "boolean" ? captions.burnIn : d.captions.burnIn,
    },
  };
}

export function readStoredSettings(): string | null {
  try {
    return localStorage.getItem(SETTINGS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeSettings(settings: RecorderSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private windows or blocked storage: settings just aren't remembered.
  }
}
