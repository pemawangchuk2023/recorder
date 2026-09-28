"use client";

import { useState } from "react";
import { ConvertSettingsPanel } from "@/app/convert/_components/convert-settings-panel";
import { FileDropZone } from "@/app/convert/_components/file-drop-zone";
import { primaryAction, smallButton } from "@/app/convert/_components/form-controls";
import { JobCard } from "@/app/convert/_components/job-card";
import { useConversionQueue } from "@/app/convert/_hooks/use-conversion-queue";
import { downloadFile } from "@/app/recorder/_lib/save-recording";
import { DEFAULT_CONVERT_SETTINGS, OUTPUT_FORMATS } from "@/constants/converter";

export function Converter() {
  const [settings, setSettings] = useState(DEFAULT_CONVERT_SETTINGS);
  const queue = useConversionQueue(settings);
  const pending = queue.jobs.filter(
    (job) => job.info && job.status !== "done" && job.status !== "converting"
  );
  const finished = queue.jobs.filter((job) => job.result);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col gap-5">
        <FileDropZone onFiles={queue.addFiles} />

        {queue.jobs.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base text-muted-foreground">
              {queue.jobs.length} {queue.jobs.length === 1 ? "file" : "files"} · converting to{" "}
              <span className="font-semibold">{OUTPUT_FORMATS[settings.format].label}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {finished.length > 1 && (
                <button
                  type="button"
                  onClick={() => finished.forEach((job) => job.result && downloadFile(job.result.blob, job.result.filename))}
                  className={smallButton}
                >
                  Download all
                </button>
              )}
              <button type="button" onClick={queue.clearAll} disabled={queue.isRunning} className={smallButton}>
                Clear
              </button>
              {queue.isRunning ? (
                <button type="button" onClick={queue.cancel} className={primaryAction}>
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={queue.convertAll}
                  disabled={pending.length === 0}
                  className={primaryAction}
                >
                  {pending.length > 1 ? `Convert ${pending.length} files` : "Convert"}
                </button>
              )}
            </div>
          </div>
        )}

        <ul className="flex flex-col gap-4">
          {queue.jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              busy={queue.isRunning}
              onConvert={() => queue.convertOne(job.id)}
              onRemove={() => queue.removeJob(job.id)}
              onTrimChange={(trim) => queue.setTrim(job.id, trim)}
            />
          ))}
        </ul>
      </div>

      <ConvertSettingsPanel settings={settings} onChange={setSettings} disabled={queue.isRunning} />
    </div>
  );
}
