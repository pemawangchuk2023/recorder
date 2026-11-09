"use client";

import { Smartphone } from "lucide-react";
import { useRef, useState } from "react";
import { convertToTikTokSize, tiktokFrameSize } from "@/app/recorder/_lib/tiktok-download";
import { downloadFile } from "@/app/recorder/_lib/save-recording";

interface TikTokDownloadButtonProps {
  blob: Blob;
  baseName: string;
  // The recording's own size.
  width: number;
  height: number;
}

export function TikTokDownloadButton({ blob, baseName, width, height }: TikTokDownloadButtonProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleDownload = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setMessage(null);
    try {
      const result = await convertToTikTokSize(blob, tiktokFrameSize(width, height), setProgress, controller.signal);
      downloadFile(result, `${baseName}-tiktok.mp4`);
      setMessage("Downloaded.");
    } catch (cause) {
      setMessage(
        controller.signal.aborted
          ? "Cancelled."
          : cause instanceof Error
            ? cause.message
            : "The TikTok size video couldn't be made."
      );
    }
    abortRef.current = null;
    setProgress(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {message && (
        <span className="text-sm text-muted-foreground" role="status">
          {message}
        </span>
      )}
      <button
        type="button"
        onClick={progress === null ? () => void handleDownload() : () => abortRef.current?.abort()}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        <Smartphone className="size-4" aria-hidden="true" />
        {progress === null ? "Download TikTok size" : `Making it… ${Math.round(progress * 100)}% · Cancel`}
      </button>
    </div>
  );
}
