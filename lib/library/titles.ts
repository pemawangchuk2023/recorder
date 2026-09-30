const TITLE_DATE = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

// e.g. "Recording · 30 Sep 2026, 14:05", in the viewer's own date style.
export function defaultRecordingTitle(date: Date): string {
  return `Recording · ${TITLE_DATE.format(date)}`;
}

// Characters Windows and macOS don't allow in file names.
const UNSAFE_FILENAME_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]+/g;
const MAX_FILENAME_LENGTH = 120;

export function titleToFilename(title: string, extension: string): string {
  const base =
    title
      .replace(UNSAFE_FILENAME_CHARACTERS, "-")
      .replace(/\s+/g, " ")
      .replace(/^[\s.-]+|[\s.-]+$/g, "")
      .slice(0, MAX_FILENAME_LENGTH) || "recording";
  return `${base}.${extension}`;
}
