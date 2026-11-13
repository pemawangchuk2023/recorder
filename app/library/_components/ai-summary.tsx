"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";
import { getAiStatus, suggestTitle, summarizeTranscript, type AiStatus } from "@/lib/on-device-ai";

interface AiSummaryProps {
  transcript: TranscriptSegment[];
  summary: string | undefined;
  onSummary: (summary: string) => void;
  onTitle: (title: string) => void;
}

type Work = { task: "summary" | "title"; download: number | null };

const button =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

// A summary and a suggested title from what was said, written by the
// browser's built-in model on this computer.
export function AiSummary({ transcript, summary, onSummary, onTitle }: AiSummaryProps) {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [work, setWork] = useState<Work | null>(null);
  const [suggested, setSuggested] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getAiStatus().then((next) => {
      if (!cancelled) {
        setStatus(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const text = transcript.map((segment) => segment.text).join(" ");
  const hasWords = text.trim().split(/\s+/).length >= 20;

  const run = async (task: Work["task"]) => {
    setWork({ task, download: null });
    setError(null);
    const onDownload = (progress: number) => setWork({ task, download: progress });
    try {
      if (task === "summary") {
        onSummary(await summarizeTranscript(text, onDownload));
      } else {
        setSuggested(await suggestTitle(text, onDownload));
      }
      setStatus("available");
    } catch {
      setError(
        "The browser's model couldn't do that just now. It needs a few GB of free disk and a recent Chrome; try again in a moment."
      );
    }
    setWork(null);
  };

  if (status === null) {
    return null;
  }
  const canRun = status === "available" || status === "downloadable" || status === "downloading";

  return (
    <section className="flex flex-col gap-3" aria-labelledby="ai-summary-heading">
      <h3 id="ai-summary-heading" className="flex items-center gap-2 text-lg font-semibold">
        <Sparkles className="size-4 text-brand" aria-hidden="true" />
        Summary
      </h3>
      {summary && <p className="text-base leading-relaxed whitespace-pre-line">{summary}</p>}

      {!canRun ? (
        <p className="text-sm text-muted-foreground">
          {status === "unsupported"
            ? "Automatic summaries and titles use a language model built into the browser, which this one doesn't have. Recent Chrome on a computer does."
            : "This device can't run the browser's built-in language model (it needs a fairly recent computer with several GB of free disk), so summaries aren't available here."}
        </p>
      ) : !hasWords ? (
        <p className="text-sm text-muted-foreground">
          {transcript.length === 0
            ? "Summaries are written from the transcript, and this recording has none. Turn on live captions before recording."
            : "There's too little speech in this recording to summarise."}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={work !== null} onClick={() => void run("summary")}>
              {work?.task === "summary" ? "Writing…" : summary ? "Write it again" : "Summarise this recording"}
            </button>
            <button type="button" className={button} disabled={work !== null} onClick={() => void run("title")}>
              {work?.task === "title" ? "Thinking…" : "Suggest a title"}
            </button>
          </div>
          {work?.download !== null && work?.download !== undefined && work.download < 1 && (
            <p role="status" className="text-sm text-muted-foreground">
              Chrome is downloading its language model (one time only): {Math.round(work.download * 100)}%
            </p>
          )}
          {suggested && (
            <p className="flex flex-wrap items-center gap-2 text-base">
              <span>
                Suggested: <span className="font-semibold">{suggested}</span>
              </span>
              <button
                type="button"
                className={button}
                onClick={() => {
                  onTitle(suggested);
                  setSuggested(null);
                }}
              >
                Use this title
              </button>
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Written on this computer by Chrome&apos;s built-in model — the transcript isn&apos;t sent
            anywhere. Check it before relying on it: small models make mistakes.
            {status !== "available" && " The first use downloads the model, which can take a few minutes."}
          </p>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
