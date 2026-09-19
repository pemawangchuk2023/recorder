"use client";

import { useMemo, useState, type RefObject } from "react";
import { TranscriptPanel } from "@/app/recorder/_components/transcript-panel";
import { TrimEditor } from "@/app/recorder/_components/trim-editor";
import { useRecordingInfo } from "@/app/recorder/_hooks/use-recording-info";
import { canTrimRecordings } from "@/app/recorder/_lib/edit-recording";
import { formatTime } from "@/app/recorder/_lib/format-time";
import {
  canShareFile,
  recordingFilename,
  saveRecording,
  shareFile,
  type SaveResult,
} from "@/app/recorder/_lib/save-recording";
import type { TranscriptSegment } from "@/app/recorder/_lib/types";

interface ReviewPanelProps {
  blob: Blob;
  transcript: TranscriptSegment[];
  isTrimmed: boolean;
  playbackRef: RefObject<HTMLVideoElement | null>;
  onTrimmed: (blob: Blob, transcript: TranscriptSegment[]) => void;
  onUndoTrim: () => void;
}

const RESULT_TEXT: Record<SaveResult, string> = {
  saved: "Saved.",
  downloaded: "Downloaded.",
  cancelled: "Save cancelled.",
};

const secondaryButton =
  "rounded-full bg-white px-6 py-3 text-base font-semibold text-emerald-900 ring-1 ring-emerald-300 transition-colors hover:bg-emerald-100 dark:bg-transparent dark:text-emerald-100 dark:ring-emerald-800 dark:hover:bg-emerald-900/50";

export function ReviewPanel({
  blob,
  transcript,
  isTrimmed,
  playbackRef,
  onTrimmed,
  onUndoTrim,
}: ReviewPanelProps) {
  const info = useRecordingInfo(blob);
  const [baseName] = useState(() => recordingFilename(new Date(), "mp4").replace(/\.mp4$/, ""));
  const file = useMemo(
    () => new File([blob], `${baseName}.mp4`, { type: "video/mp4" }),
    [blob, baseName]
  );
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setResult(null);
    setResult(await saveRecording(blob, file.name));
    setIsSaving(false);
  };

  const details = [
    info ? formatTime(Math.round(info.duration)) : null,
    `${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
    info?.codec ? `${info.codec} MP4` : "MP4",
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
        <div>
          <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
            Your recording is ready
          </p>
          <p className="text-base text-emerald-800/80 dark:text-emerald-200/70">
            {details.join(" · ")}
            {isTrimmed && (
              <>
                {" · Trimmed "}
                <button
                  type="button"
                  onClick={onUndoTrim}
                  className="font-medium underline underline-offset-2 hover:no-underline"
                >
                  Undo
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {result && (
            <span className="text-base text-emerald-900 dark:text-emerald-100" role="status">
              {RESULT_TEXT[result]}
            </span>
          )}
          {canShareFile(file) && (
            <button type="button" onClick={() => void shareFile(file)} className={secondaryButton}>
              Share…
            </button>
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

      {((info && info.duration > 1 && canTrimRecordings()) || transcript.length > 0) && (
        <div className="flex flex-col gap-6 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {info && info.duration > 1 && canTrimRecordings() && (
            <TrimEditor
              blob={blob}
              duration={info.duration}
              transcript={transcript}
              playbackRef={playbackRef}
              onTrimmed={onTrimmed}
            />
          )}
          {transcript.length > 0 && (
            <TranscriptPanel segments={transcript} baseName={baseName} playbackRef={playbackRef} />
          )}
        </div>
      )}
    </div>
  );
}
