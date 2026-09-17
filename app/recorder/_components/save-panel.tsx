"use client";

import { useState } from "react";
import { saveRecording, type SaveResult } from "@/app/recorder/_lib/save-recording";

const RESULT_TEXT: Record<SaveResult, string> = {
  saved: "Saved.",
  downloaded: "Downloaded.",
  cancelled: "Save cancelled.",
};

export function SavePanel({ blob }: { blob: Blob }) {
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setResult(null);
    setResult(await saveRecording(blob));
    setIsSaving(false);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
      <div>
        <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
          Your recording is ready
        </p>
        <p className="text-base text-emerald-800/80 dark:text-emerald-200/70">
          MP4 · {(blob.size / (1024 * 1024)).toFixed(1)} MB
        </p>
      </div>
      <div className="flex items-center gap-4">
        {result && (
          <span className="text-base text-emerald-900 dark:text-emerald-100">
            {RESULT_TEXT[result]}
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save recording"}
        </button>
      </div>
    </div>
  );
}
