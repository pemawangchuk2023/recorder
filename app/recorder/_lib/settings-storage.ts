import { CORNER_POSITIONS } from "@/app/recorder/_lib/bubble-geometry";
import { RESOLUTIONS } from "@/app/recorder/_lib/recording-format";
import type {
  BubbleCorner,
  BubblePosition,
  CameraFraming,
  RecorderSettings,
  ScreenArea,
} from "@/app/recorder/_lib/types";
import {
  BUBBLE_SHAPES,
  BUBBLE_SIZE_RANGE,
  COUNTDOWN_OPTIONS,
  DEFAULT_FRAMING,
  DEFAULT_SETTINGS,
  MIN_SCREEN_AREA,
  LAYOUT_OPTIONS,
  MAX_CAMERA_ZOOM,
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

function fraction(value: unknown): value is number {
  return typeof value === "number" && value >= 0 && value <= 1;
}

// Older versions saved a corner instead of a position.
function bubblePosition(camera: Record<string, unknown>, fallback: BubblePosition): BubblePosition {
  const position = camera.position as Record<string, unknown> | undefined;
  if (position && fraction(position.x) && fraction(position.y)) {
    return { x: position.x, y: position.y };
  }
  const corner = camera.corner as BubbleCorner | undefined;
  return corner && corner in CORNER_POSITIONS ? CORNER_POSITIONS[corner] : fallback;
}

function cameraFraming(value: unknown): CameraFraming {
  const framing = (value ?? {}) as Record<string, unknown>;
  const zoom = framing.zoom;
  return {
    zoom: typeof zoom === "number" && zoom >= 1 && zoom <= MAX_CAMERA_ZOOM ? zoom : DEFAULT_FRAMING.zoom,
    x: fraction(framing.x) ? framing.x : DEFAULT_FRAMING.x,
    y: fraction(framing.y) ? framing.y : DEFAULT_FRAMING.y,
  };
}

// Older versions saved a named size.
const NAMED_BUBBLE_SIZES: Record<string, number> = { small: 0.22, medium: 0.3, large: 0.38, xl: 0.5 };

function bubbleSize(value: unknown, fallback: number): number {
  if (typeof value === "string") {
    return NAMED_BUBBLE_SIZES[value] ?? fallback;
  }
  return typeof value === "number" && value >= BUBBLE_SIZE_RANGE.min && value <= BUBBLE_SIZE_RANGE.max
    ? value
    : fallback;
}

// Saved by an earlier version (zoom/centre, fit or fill): start from the whole
// screen instead.
function screenArea(stacked: Record<string, unknown>): ScreenArea {
  const area = (stacked.area ?? {}) as Record<string, unknown>;
  const { x, y, width, height } = area;
  if (
    fraction(x) &&
    fraction(y) &&
    typeof width === "number" &&
    typeof height === "number" &&
    width >= MIN_SCREEN_AREA &&
    height >= MIN_SCREEN_AREA &&
    x + width <= 1 + 1e-6 &&
    y + height <= 1 + 1e-6
  ) {
    return { x, y, width, height };
  }
  return DEFAULT_SETTINGS.stacked.area;
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
  const stacked = (stored.stacked ?? {}) as Record<string, unknown>;
  const values = <T>(options: readonly { value: T }[]) => options.map((option) => option.value);

  return {
    source: oneOf(stored.source, ["screen", "camera"] as const, d.source),
    resolution: oneOf(stored.resolution, Object.keys(RESOLUTIONS) as (keyof typeof RESOLUTIONS)[], d.resolution),
    frameRate: oneOf(stored.frameRate, values(FRAME_RATE_OPTIONS), d.frameRate),
    codec: oneOf(stored.codec, Object.keys(VIDEO_CODECS) as (keyof typeof VIDEO_CODECS)[], d.codec),
    quality: oneOf(stored.quality, Object.keys(VIDEO_QUALITIES) as (keyof typeof VIDEO_QUALITIES)[], d.quality),
    countdown: oneOf(stored.countdown, values(COUNTDOWN_OPTIONS), d.countdown),
    layout: oneOf(stored.layout, values(LAYOUT_OPTIONS), d.layout),
    stacked: { area: screenArea(stacked) },
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
      position: bubblePosition(camera, d.camera.position),
      size: bubbleSize(camera.size, d.camera.size),
      shape: oneOf(camera.shape, values(BUBBLE_SHAPES), d.camera.shape),
      mirror: typeof camera.mirror === "boolean" ? camera.mirror : d.camera.mirror,
      framing: cameraFraming(camera.framing),
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
