// How much recording fits in the space the browser gives this site. All of
// it is estimation: the encoder aims for constant quality, so a still screen
// uses far less than this and a busy one can use more.

// Kept free so the library can still write its index and thumbnails.
export const STORAGE_MARGIN_BYTES = 150 * 1024 * 1024;

// Below this many seconds of room, the recorder warns before starting.
export const LOW_SPACE_SECONDS = 10 * 60;

export interface StorageReading {
  quota: number;
  usage: number;
}

// Constant-quality screen video lands at about a third of the bitrate a
// fixed-bitrate recording would need (measured; see recording-format.ts).
export function estimatedBytesPerSecond(fixedVideoBitrate: number, audioBitrate: number): number {
  return (fixedVideoBitrate / 3 + audioBitrate) / 8;
}

// A finished take is briefly stored twice: its recording file, and the copy
// the library keeps. So only half the free space is really available.
export function recordableSeconds(reading: StorageReading, bytesPerSecond: number): number {
  const free = reading.quota - reading.usage - STORAGE_MARGIN_BYTES;
  if (bytesPerSecond <= 0) {
    return 0;
  }
  return Math.max(0, free / 2 / bytesPerSecond);
}

// True once the take being recorded could no longer be copied into the
// library. Stopping here keeps the whole take; carrying on would lose it.
export function shouldStopForSpace(
  reading: StorageReading,
  usageAtStart: number,
  bytesPerSecond: number
): boolean {
  const free = reading.quota - reading.usage;
  const written = Math.max(0, reading.usage - usageAtStart);
  // Room for the library's copy, the margin, and the next half minute.
  return free < written + STORAGE_MARGIN_BYTES + bytesPerSecond * 30;
}

// "about 5 hours", "about 40 minutes", "under a minute".
export function formatRoughDuration(seconds: number): string {
  if (seconds < 60) {
    return "under a minute";
  }
  const minutes = seconds / 60;
  if (minutes < 90) {
    const rounded = minutes < 10 ? Math.floor(minutes) : Math.floor(minutes / 5) * 5;
    return `about ${rounded} minute${rounded === 1 ? "" : "s"}`;
  }
  const hours = minutes / 60;
  if (hours < 10) {
    const rounded = Math.floor(hours * 2) / 2;
    return `about ${rounded} hours`;
  }
  return `over ${Math.floor(hours / 10) * 10} hours`;
}
