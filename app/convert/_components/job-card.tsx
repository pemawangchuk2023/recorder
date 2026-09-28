"use client";

import { ProgressBar, smallButton } from "@/app/convert/_components/form-controls";
import { ResultPreview } from "@/app/convert/_components/result-preview";
import { TrimRange } from "@/app/convert/_components/trim-range";
import { formatBytes, formatSizeChange } from "@/app/convert/_lib/format-bytes";
import type { ConvertJob, MediaInfo, TrimRange as Range } from "@/app/convert/_lib/types";
import { formatTime } from "@/app/recorder/_lib/format-time";
import { canShareFile, downloadFile, shareFile } from "@/app/recorder/_lib/save-recording";

interface JobCardProps {
  job: ConvertJob;
  busy: boolean;
  onConvert: () => void;
  onRemove: () => void;
  onTrimChange: (trim: Range | null) => void;
}

function describeInfo(info: MediaInfo, size: number): string {
  const parts = [info.container, formatTime(Math.round(info.duration))];
  if (info.video) {
    parts.push(`${info.video.width}×${info.video.height}`, info.video.codec ?? "");
  }
  if (info.audio) {
    parts.push(info.audio.codec ?? "", info.audio.channels === 1 ? "mono" : "");
  }
  if (!info.audio) {
    parts.push("no sound");
  }
  parts.push(formatBytes(size));
  return parts.filter(Boolean).join(" · ");
}

export function JobCard({ job, busy, onConvert, onRemove, onTrimChange }: JobCardProps) {
  const { info, result } = job;
  const resultFile = result ? new File([result.blob], result.filename, { type: result.blob.type }) : null;

  return (
    <li className="flex flex-col gap-4 rounded-3xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold" title={job.file.name}>
            {job.file.name}
          </p>
          <p className="text-base text-muted-foreground">
            {info ? describeInfo(info, job.file.size) : job.status === "reading" ? "Reading…" : formatBytes(job.file.size)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {info && job.status !== "converting" && (
            <button type="button" onClick={onConvert} disabled={busy} className={smallButton}>
              {job.status === "done" ? "Convert again" : job.status === "ready" ? "Convert" : "Try again"}
            </button>
          )}
          <button type="button" onClick={onRemove} disabled={job.status === "converting"} className={smallButton}>
            Remove
          </button>
        </div>
      </div>

      {info && info.duration > 1 && job.status !== "converting" && (
        <details className="group">
          <summary className="cursor-pointer text-base font-medium text-zinc-700 dark:text-zinc-300">
            Trim{job.trim ? " (on)" : ""}
          </summary>
          <div className="mt-3">
            <TrimRange duration={info.duration} value={job.trim} onChange={onTrimChange} />
          </div>
        </details>
      )}

      {job.status === "converting" && (
        <div className="flex flex-col gap-2">
          <ProgressBar value={job.progress} label={`Converting ${job.file.name}`} />
          <p className="text-base text-zinc-500 tabular-nums dark:text-zinc-400">
            Converting… {Math.round(job.progress * 100)}%
          </p>
        </div>
      )}
      {job.status === "cancelled" && (
        <p className="text-base text-muted-foreground">Cancelled.</p>
      )}
      {job.error && (
        <p role="alert" className="text-base text-red-700 dark:text-red-300">
          {job.error}
        </p>
      )}

      {job.status === "done" && result && resultFile && (
        <div className="flex flex-col gap-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/40">
          <ResultPreview blob={result.blob} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-emerald-900 dark:text-emerald-100">
              <span className="font-semibold">{result.filename}</span> ·{" "}
              {formatBytes(result.blob.size)} ({formatSizeChange(job.file.size, result.blob.size)})
            </p>
            <div className="flex flex-wrap gap-2">
              {canShareFile(resultFile) && (
                <button type="button" onClick={() => void shareFile(resultFile)} className={smallButton}>
                  Share…
                </button>
              )}
              <button
                type="button"
                onClick={() => downloadFile(result.blob, result.filename)}
                className="rounded-full bg-emerald-600 px-5 py-2 text-base font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
