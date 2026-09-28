"use client";

import { useRef, useState } from "react";
import { ProgressBar, Select, smallButton } from "@/app/convert/_components/form-controls";
import { convertMedia } from "@/app/convert/_lib/convert-media";
import type { OutputFormatId } from "@/app/convert/_lib/types";
import { downloadFile } from "@/app/recorder/_lib/save-recording";
import { DEFAULT_CONVERT_SETTINGS, FORMAT_GROUPS, OUTPUT_FORMATS } from "@/constants/converter";

// Everything except MP4, which the recording already is.
const EXPORT_OPTIONS = FORMAT_GROUPS.flatMap((group) => group.formats)
  .filter((format) => format !== "mp4")
  .map((format) => ({
    value: format,
    label: `${OUTPUT_FORMATS[format].label} — ${OUTPUT_FORMATS[format].description}`,
  }));

export function ExportPanel({ blob, baseName }: { blob: Blob; baseName: string }) {
  const [format, setFormat] = useState<OutputFormatId>("mp3");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleExport = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setMessage(null);
    const filename = `${baseName}.${OUTPUT_FORMATS[format].extension}`;
    try {
      const result = await convertMedia(blob, { ...DEFAULT_CONVERT_SETTINGS, format }, {
        trim: null,
        onProgress: setProgress,
        signal: controller.signal,
      });
      downloadFile(result, filename);
      setMessage(`Downloaded ${filename}.`);
    } catch (cause) {
      setMessage(
        controller.signal.aborted
          ? "Cancelled."
          : cause instanceof Error
            ? cause.message
            : "The recording couldn't be converted."
      );
    }
    abortRef.current = null;
    setProgress(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold">Save as another format</h3>
        <p className="text-base text-muted-foreground">
          Pull out just the audio, make a GIF, or save for editing apps.
          More options on the{" "}
          <a href="/convert" target="_blank" className="font-medium underline underline-offset-2 hover:no-underline">
            Converter
          </a>
          .
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <Select label="Format" value={format} options={EXPORT_OPTIONS} onChange={setFormat} />
        </div>
        {progress === null ? (
          <button type="button" onClick={handleExport} className={smallButton}>
            Convert and download
          </button>
        ) : (
          <button type="button" onClick={() => abortRef.current?.abort()} className={smallButton}>
            Cancel
          </button>
        )}
      </div>
      {progress !== null && <ProgressBar value={progress} label="Converting recording" />}
      {message && (
        <p role="status" className="text-base text-zinc-700 dark:text-zinc-300">
          {message}
        </p>
      )}
    </div>
  );
}
