import type { Chapter, TranscriptSegment } from "@/app/recorder/_lib/types";

// A recording kept in this browser's library. The video and thumbnail are
// stored separately (see recordings-db.ts), so listing stays fast.
export interface LibraryRecording {
  id: string;
  title: string;
  // Milliseconds since the epoch.
  createdAt: number;
  updatedAt: number;
  // Changes only when the video itself is replaced (e.g. trimmed), so a
  // rename doesn't reload the player. Missing on older entries.
  fileVersion?: number;
  // Seconds.
  duration: number;
  // Bytes of the video file.
  size: number;
  // Display name of the video codec, e.g. "H.264".
  codec: string | null;
  width: number | null;
  height: number | null;
  transcript: TranscriptSegment[];
  // Missing on older entries.
  chapters?: Chapter[];
}

export interface NewLibraryRecording {
  title: string;
  video: Blob;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
}

// The video file's version, for reloading the player and thumbnail.
export function fileVersionOf(recording: LibraryRecording): number {
  return recording.fileVersion ?? recording.createdAt;
}
