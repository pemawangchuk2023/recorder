"use client";

import { useRef, useState, type DragEvent } from "react";
import { ACCEPTED_FILES } from "@/constants/converter";

export function FileDropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) {
      onFiles([...event.dataTransfer.files]);
    }
  };

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-4 rounded-3xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isDragging
          ? "border-red-500 bg-red-50 dark:bg-red-950/40"
          : "border-border bg-card"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-10 w-10 text-zinc-400"
        aria-hidden="true"
      >
        <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </svg>
      <div>
        <p className="text-lg font-semibold">Drop videos or audio here</p>
        <p className="text-base text-muted-foreground">
          MP4, WebM, MOV, MKV, MP3, WAV, OGG, FLAC, AAC… Add as many as you like.
        </p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded-full bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Choose files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILES}
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            onFiles([...event.target.files]);
          }
          event.target.value = "";
        }}
      />
    </div>
  );
}
