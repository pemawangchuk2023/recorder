import type { Chapter } from "@/app/recorder/_lib/types";

// YouTube only shows chapters when the description lists at least three,
// the first at 0:00, each at least 10 seconds long.
export const YOUTUBE_MIN_CHAPTERS = 3;
export const YOUTUBE_MIN_CHAPTER_SECONDS = 10;

export function sortChapters(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.time - b.time);
}

// The list for YouTube adds an "Intro" at 0:00 itself when needed.
export function nextChapterTitle(chapters: Chapter[]): string {
  return `Chapter ${chapters.length + 1}`;
}

// Keeps the markers inside [start, end] and re-times them to the trimmed video.
export function trimChapters(chapters: Chapter[], start: number, end: number): Chapter[] {
  return chapters
    .filter((chapter) => chapter.time >= start && chapter.time < end)
    .map((chapter) => ({ ...chapter, time: chapter.time - start }));
}

// 0:00, 4:05, 1:02:03 — the timestamp style YouTube recognises.
export function formatChapterTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds / 60) % 60;
  const s = (seconds % 60).toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

export interface YouTubeChapters {
  // Ready to paste into a description; empty when there are no chapters.
  text: string;
  // Why YouTube won't show them as chapters yet, if it won't.
  problem: string | null;
}

// The chapter list for a YouTube description. A first chapter is added at
// 0:00 if the markers don't start there, as YouTube requires.
export function toYouTubeChapters(chapters: Chapter[], duration: number): YouTubeChapters {
  const sorted = sortChapters(chapters).filter((chapter) => chapter.time < duration);
  if (sorted.length === 0) {
    return { text: "", problem: null };
  }
  const list = sorted[0].time < 1 ? sorted : [{ time: 0, title: "Intro" }, ...sorted];
  const text = list
    .map((chapter, index) => `${formatChapterTime(index === 0 ? 0 : chapter.time)} ${chapter.title.trim() || `Chapter ${index + 1}`}`)
    .join("\n");

  let problem: string | null = null;
  if (list.length < YOUTUBE_MIN_CHAPTERS) {
    problem = `YouTube needs at least ${YOUTUBE_MIN_CHAPTERS} chapters to show them.`;
  } else {
    const ends = [...list.slice(1).map((chapter) => chapter.time), duration];
    const short = list.findIndex((chapter, index) => ends[index] - chapter.time < YOUTUBE_MIN_CHAPTER_SECONDS);
    if (short !== -1) {
      problem = `“${list[short].title}” is shorter than ${YOUTUBE_MIN_CHAPTER_SECONDS} seconds; YouTube needs every chapter to be at least that long.`;
    }
  }
  return { text, problem };
}
