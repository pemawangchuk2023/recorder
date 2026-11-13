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
  // The folder it's filed in; missing or null means none.
  folderId?: string | null;
  // Notes and reactions pinned to moments of the video.
  comments?: RecordingComment[];
  // A short summary of what's said, written on this device.
  summary?: string;
  // Changes when a custom thumbnail is chosen, so cards reload it.
  thumbnailVersion?: number;
}

// A note or an emoji reaction at a moment of a recording. These stay in this
// browser: with no server there is nobody else to show them to.
export interface RecordingComment {
  id: string;
  // Seconds into the video.
  time: number;
  // The note's text, or a single emoji for a reaction.
  text: string;
  kind: "note" | "reaction";
  // Milliseconds since the epoch.
  createdAt: number;
}

export interface LibraryFolder {
  id: string;
  name: string;
  // Milliseconds since the epoch.
  createdAt: number;
}

export interface NewLibraryRecording {
  title: string;
  video: Blob;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
  folderId?: string | null;
}

// The video file's version, for reloading the player and thumbnail.
export function fileVersionOf(recording: LibraryRecording): number {
  return recording.fileVersion ?? recording.createdAt;
}

// Changes when either the video or a hand-picked thumbnail does.
export function thumbnailVersionOf(recording: LibraryRecording): number {
  return fileVersionOf(recording) + (recording.thumbnailVersion ?? 0);
}
