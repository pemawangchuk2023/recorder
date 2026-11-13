import type { LibraryRecording } from "@/lib/library/types";
import type { LibrarySort } from "@/constants/recorder";

// Which folder is shown: everything, only recordings in no folder, or one
// folder by its id.
export type FolderFilter = { kind: "all" } | { kind: "unfiled" } | { kind: "folder"; id: string };

export const ALL_FOLDERS: FolderFilter = { kind: "all" };

const COMPARE: Record<LibrarySort, (a: LibraryRecording, b: LibraryRecording) => number> = {
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  longest: (a, b) => b.duration - a.duration,
  largest: (a, b) => b.size - a.size,
};

export function isInFolder(recording: LibraryRecording, folder: FolderFilter): boolean {
  if (folder.kind === "all") {
    return true;
  }
  return folder.kind === "unfiled" ? !recording.folderId : recording.folderId === folder.id;
}

// Matches the title, a chapter, or anything said in the recording.
export function filterRecordings(
  recordings: LibraryRecording[],
  query: string,
  sort: LibrarySort,
  folder: FolderFilter = ALL_FOLDERS
): LibraryRecording[] {
  const needle = query.trim().toLowerCase();
  const matches = recordings.filter(
    (recording) =>
      isInFolder(recording, folder) &&
      (!needle ||
        recording.title.toLowerCase().includes(needle) ||
        (recording.chapters ?? []).some((chapter) => chapter.title.toLowerCase().includes(needle)) ||
        recording.transcript.some((segment) => segment.text.toLowerCase().includes(needle)))
  );
  return [...matches].sort(COMPARE[sort]);
}

// The line of transcript that matched a search, to show under the title.
export function matchingLine(recording: LibraryRecording, query: string): { time: number; text: string } | null {
  const needle = query.trim().toLowerCase();
  if (!needle || recording.title.toLowerCase().includes(needle)) {
    return null;
  }
  const segment = recording.transcript.find((each) => each.text.toLowerCase().includes(needle));
  return segment ? { time: segment.start, text: segment.text } : null;
}
