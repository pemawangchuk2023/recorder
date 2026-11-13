// Titles and summaries written by the browser's own built-in language model
// (Chrome's Summarizer API, backed by Gemini Nano). The model runs on this
// computer: the transcript is never sent anywhere, and there is no API key
// or fee. Browsers without it simply don't offer the feature.

export type AiStatus =
  // This browser has no built-in model.
  | "unsupported"
  // Present, but this device can't run it (too little memory or disk).
  | "unavailable"
  // Ready after a one-time download that the browser does itself.
  | "downloadable"
  | "downloading"
  | "available";

interface SummarizerOptions {
  type: "tldr" | "key-points" | "teaser" | "headline";
  format: "plain-text" | "markdown";
  length: "short" | "medium" | "long";
  expectedInputLanguages?: string[];
  outputLanguage?: string;
  monitor?: (monitor: EventTarget) => void;
}

interface SummarizerInstance {
  summarize(text: string, options?: { context?: string }): Promise<string>;
  destroy(): void;
}

interface SummarizerApi {
  availability(options?: Partial<SummarizerOptions>): Promise<Exclude<AiStatus, "unsupported">>;
  create(options: SummarizerOptions): Promise<SummarizerInstance>;
}

// The model reads a limited amount at once; a long transcript is summarised
// in parts and the parts are then summarised together.
const PART_CHARACTERS = 6000;
const MAX_PARTS = 12;

function summarizerApi(): SummarizerApi | null {
  const api = (globalThis as { Summarizer?: SummarizerApi }).Summarizer;
  return api && typeof api.create === "function" && typeof api.availability === "function" ? api : null;
}

const LANGUAGE = { expectedInputLanguages: ["en"], outputLanguage: "en" };

export async function getAiStatus(): Promise<AiStatus> {
  const api = summarizerApi();
  if (!api) {
    return "unsupported";
  }
  try {
    return await api.availability(LANGUAGE);
  } catch {
    return "unavailable";
  }
}

// Splits at sentence ends where it can, so no part stops mid-thought.
export function splitForSummary(text: string, partCharacters = PART_CHARACTERS): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > partCharacters) {
    const window = rest.slice(0, partCharacters);
    const sentenceEnd = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
    const cut = sentenceEnd > partCharacters / 2 ? sentenceEnd + 1 : (window.lastIndexOf(" ") > 0 ? window.lastIndexOf(" ") : partCharacters);
    parts.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) {
    parts.push(rest);
  }
  return parts;
}

async function run(
  type: SummarizerOptions["type"],
  length: SummarizerOptions["length"],
  text: string,
  onDownload: (progress: number) => void
): Promise<string> {
  const api = summarizerApi();
  if (!api) {
    throw new Error("This browser has no built-in language model.");
  }
  const summarizer = await api.create({
    type,
    length,
    format: "plain-text",
    ...LANGUAGE,
    monitor(monitor) {
      monitor.addEventListener("downloadprogress", (event) => {
        onDownload((event as ProgressEvent).loaded);
      });
    },
  });
  try {
    const context = "This is the transcript of a screen recording with spoken narration.";
    const parts = splitForSummary(text).slice(0, MAX_PARTS);
    if (parts.length === 1) {
      return (await summarizer.summarize(parts[0], { context })).trim();
    }
    const partials: string[] = [];
    for (const part of parts) {
      partials.push(await summarizer.summarize(part, { context }));
    }
    return (await summarizer.summarize(partials.join("\n"), { context })).trim();
  } finally {
    summarizer.destroy();
  }
}

// A few sentences on what the recording covers. Call from a click: the
// browser may need one to start downloading its model.
export function summarizeTranscript(text: string, onDownload: (progress: number) => void): Promise<string> {
  return run("tldr", "medium", text, onDownload);
}

// A short title for the recording.
export async function suggestTitle(text: string, onDownload: (progress: number) => void): Promise<string> {
  const title = await run("headline", "short", text, onDownload);
  // Models sometimes wrap a headline in quotes or end it with a full stop.
  return title.replace(/^["“'‘]+|["”'’.]+$/g, "").replace(/\s+/g, " ").slice(0, 120);
}
