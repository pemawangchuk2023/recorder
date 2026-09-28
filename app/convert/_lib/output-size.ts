import type { ResolutionChoice, RotationChoice } from "@/app/convert/_lib/types";

export interface Size {
  width: number;
  height: number;
}

export function rotatedSize(size: Size, rotate: RotationChoice): Size {
  return rotate === 90 || rotate === 270 ? { width: size.height, height: size.width } : size;
}

// Scales `size` so its shorter side is at most `shortSide`. Never upscales,
// and keeps both sides even, which most video encoders require.
export function fitShortSide(size: Size, shortSide: number): Size | null {
  const current = Math.min(size.width, size.height);
  if (current <= shortSide) {
    return null;
  }
  const scale = shortSide / current;
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2);
  return { width: even(size.width), height: even(size.height) };
}

export function targetShortSide(resolution: ResolutionChoice, fallback: number | null): number | null {
  return resolution === "original" ? fallback : resolution;
}
