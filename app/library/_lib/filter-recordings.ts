import type { LibraryRecording } from "@/lib/library/types";
import type { LibrarySort } from "@/constants/recorder";

const COMPARE: Record<LibrarySort, (a: LibraryRecording, b: LibraryRecording) => number> = {
  newest: (a, b) => b.createdAt - a.createdAt,
  oldest: (a, b) => a.createdAt - b.createdAt,
  longest: (a, b) => b.duration - a.duration,
  largest: (a, b) => b.size - a.size,
};

// Matches the title, a chapter, or anything said in the recording.
export function filterRecordings(
  recordings: LibraryRecording[],
  query: string,
  sort: LibrarySort
): LibraryRecording[] {
  const needle = query.trim().toLowerCase();
  const matches = needle
    ? recordings.filter(
        (recording) =>
          recording.title.toLowerCase().includes(needle) ||
          (recording.chapters ?? []).some((chapter) => chapter.title.toLowerCase().includes(needle)) ||
          recording.transcript.some((segment) => segment.text.toLowerCase().includes(needle))
      )
    : recordings;
  return [...matches].sort(COMPARE[sort]);
}
