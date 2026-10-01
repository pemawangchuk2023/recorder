import {
  YOUTUBE_DESCRIPTION_MAX,
  YOUTUBE_SHORTS_MAX_SECONDS,
  YOUTUBE_TAGS_MAX,
  YOUTUBE_TITLE_MAX,
} from "@/constants/youtube";

// "intro, how to, demo" → ["intro", "how to", "demo"]
export function parseTags(text: string): string[] {
  return [...new Set(text.split(",").map((tag) => tag.trim().replace(/[<>]/g, "")).filter(Boolean))];
}

// YouTube counts a tag with a space as if it were quoted (+2 characters).
function tagsLength(tags: string[]): number {
  return tags.reduce((total, tag) => total + tag.length + (tag.includes(" ") ? 2 : 0), 0) + Math.max(0, tags.length - 1);
}

// The description as uploaded: the text, then the chapter list.
export function buildDescription(text: string, chapters: string): string {
  return [text.trim(), chapters].filter(Boolean).join("\n\n");
}

// Vertical or square, and short enough: YouTube publishes it as a Short.
export function isShortsVideo(width: number | null, height: number | null, duration: number): boolean {
  return width !== null && height !== null && height >= width && duration <= YOUTUBE_SHORTS_MAX_SECONDS;
}

// Problems that would make YouTube reject the upload; empty when it's fine.
export function validateDetails(title: string, description: string, tags: string[]): string[] {
  const problems: string[] = [];
  if (!title.trim()) {
    problems.push("Add a title.");
  }
  if (title.length > YOUTUBE_TITLE_MAX) {
    problems.push(`The title is ${title.length - YOUTUBE_TITLE_MAX} characters too long.`);
  }
  if (/[<>]/.test(title) || /[<>]/.test(description)) {
    problems.push("YouTube doesn't allow < or > in the title or description.");
  }
  const bytes = new TextEncoder().encode(description).length;
  if (bytes > YOUTUBE_DESCRIPTION_MAX) {
    problems.push(`The description is ${bytes - YOUTUBE_DESCRIPTION_MAX} characters too long.`);
  }
  if (tagsLength(tags) > YOUTUBE_TAGS_MAX) {
    problems.push(`The tags are too long; YouTube allows ${YOUTUBE_TAGS_MAX} characters in all.`);
  }
  return problems;
}
