export function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// m:ss.t — tenths of a second, for trim points.
export function formatPreciseTime(totalSeconds: number): string {
  const tenths = Math.max(0, Math.round(totalSeconds * 10));
  const minutes = Math.floor(tenths / 600);
  const seconds = Math.floor(tenths / 10) % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}.${tenths % 10}`;
}
