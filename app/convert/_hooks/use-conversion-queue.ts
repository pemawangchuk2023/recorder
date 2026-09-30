import { useRef, useState } from "react";
import { convertMedia } from "@/app/convert/_lib/convert-media";
import { replaceExtension } from "@/lib/format-bytes";
import { readMediaInfo } from "@/app/convert/_lib/media-info";
import type { ConvertJob, ConvertSettings, TrimRange } from "@/app/convert/_lib/types";
import { OUTPUT_FORMATS } from "@/constants/converter";

// Trim points this close to the ends count as "not trimmed".
const EDGE_SECONDS = 0.05;

function describeError(cause: unknown): string {
  if (cause instanceof Error && cause.message) {
    return cause.message;
  }
  return "Something went wrong while converting this file.";
}

// A list of files waiting to be converted, converted one at a time with the
// shared settings. Files and results live only in this tab's memory.
export function useConversionQueue(settings: ConvertSettings) {
  const [jobs, setJobs] = useState<ConvertJob[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const updateJob = (id: string, patch: Partial<ConvertJob>) =>
    setJobs((prev) => prev.map((job) => (job.id === id ? { ...job, ...patch } : job)));

  const addFiles = (files: Iterable<File>) => {
    const added: ConvertJob[] = [...files].map((file) => ({
      id: crypto.randomUUID(),
      file,
      info: null,
      trim: null,
      status: "reading",
      progress: 0,
      result: null,
      error: null,
    }));
    setJobs((prev) => [...prev, ...added]);
    for (const job of added) {
      readMediaInfo(job.file).then(
        (info) => updateJob(job.id, { info, status: "ready" }),
        () =>
          updateJob(job.id, {
            status: "error",
            error: "This doesn't look like a video or audio file this browser can read.",
          })
      );
    }
  };

  const removeJob = (id: string) => setJobs((prev) => prev.filter((job) => job.id !== id));

  const clearAll = () => setJobs([]);

  const setTrim = (id: string, trim: TrimRange | null) => updateJob(id, { trim });

  const run = async (queue: ConvertJob[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setIsRunning(true);
    for (const job of queue) {
      if (controller.signal.aborted) {
        break;
      }
      updateJob(job.id, { status: "converting", progress: 0, result: null, error: null });
      try {
        const duration = job.info?.duration ?? 0;
        const trimmed =
          job.trim && (job.trim.start > EDGE_SECONDS || job.trim.end < duration - EDGE_SECONDS)
            ? job.trim
            : null;
        const blob = await convertMedia(job.file, settings, {
          trim: trimmed,
          onProgress: (progress) => updateJob(job.id, { progress }),
          signal: controller.signal,
        });
        const filename = replaceExtension(job.file.name, OUTPUT_FORMATS[settings.format].extension);
        updateJob(job.id, { status: "done", progress: 1, result: { blob, filename } });
      } catch (cause) {
        updateJob(
          job.id,
          controller.signal.aborted
            ? { status: "cancelled", progress: 0 }
            : { status: "error", error: describeError(cause) }
        );
      }
    }
    abortRef.current = null;
    setIsRunning(false);
  };

  const convertAll = () =>
    void run(jobs.filter((job) => job.info && job.status !== "converting" && job.status !== "done"));

  const convertOne = (id: string) =>
    void run(jobs.filter((job) => job.id === id && job.info));

  const cancel = () => abortRef.current?.abort();

  return { jobs, isRunning, addFiles, removeJob, clearAll, setTrim, convertAll, convertOne, cancel };
}
