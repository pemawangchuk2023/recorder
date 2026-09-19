import { formatTime } from "@/app/recorder/_lib/format-time";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";

// SubRip needs HH:MM:SS,mmm.
function srtTimestamp(seconds: number): string {
  const totalMs = Math.max(0, Math.round(seconds * 1000));
  const pad = (value: number, length = 2) => value.toString().padStart(length, "0");
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor(totalMs / 60_000) % 60;
  const secs = Math.floor(totalMs / 1000) % 60;
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(totalMs % 1000, 3)}`;
}

// .srt files work with YouTube, Vimeo, VLC and most video editors.
export function toSrt(segments: TranscriptSegment[]): string {
  return segments
    .map(
      (segment, index) =>
        `${index + 1}\n${srtTimestamp(segment.start)} --> ${srtTimestamp(segment.end)}\n${segment.text}\n`
    )
    .join("\n");
}

export function toPlainText(segments: TranscriptSegment[]): string {
  return segments
    .map((segment) => `[${formatTime(Math.floor(segment.start))}] ${segment.text}`)
    .join("\n");
}

// Keeps the lines inside [start, end] and re-times them to the trimmed video.
export function trimTranscript(
  segments: TranscriptSegment[],
  start: number,
  end: number
): TranscriptSegment[] {
  return segments
    .filter((segment) => segment.end > start && segment.start < end)
    .map((segment) => ({
      text: segment.text,
      start: Math.max(0, segment.start - start),
      end: Math.min(end, segment.end) - start,
    }));
}
