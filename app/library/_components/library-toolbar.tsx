"use client";

import { ListChecks, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { LIBRARY_SORTS, type LibrarySort } from "@/constants/recorder";

interface LibraryToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  count: number;
  onDeleteAll: () => void;
  // Starts picking several recordings to move or delete together.
  onSelect: () => void;
  onImport: (files: File[]) => void;
  isImporting: boolean;
}

export function LibraryToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  count,
  onDeleteAll,
  onSelect,
  onImport,
  isImporting,
}: LibraryToolbarProps) {
  const [confirming, setConfirming] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-labelledby="delete-all-question"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50"
      >
        <p id="delete-all-question" className="text-base font-medium text-red-900 dark:text-red-100">
          Delete all {count} recordings from this browser? This can&apos;t be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => setConfirming(false)}
            className="rounded-full bg-background px-4 py-2 text-sm font-semibold ring-1 ring-border hover:bg-muted"
          >
            Keep them
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              onDeleteAll();
            }}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Delete all
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-0 flex-1 basis-64">
        <span className="sr-only">Search recordings</span>
        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search titles and transcripts"
          className="w-full rounded-full border border-input bg-card py-2.5 pr-4 pl-10 text-base"
        />
      </label>
      <label>
        <span className="sr-only">Sort</span>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value as LibrarySort)}
          className="rounded-full border border-input bg-card px-4 py-2.5 text-base"
        >
          {LIBRARY_SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onSelect}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-medium hover:bg-muted"
      >
        <ListChecks className="size-4" aria-hidden="true" />
        Select
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,.mp4,.m4v,.mov"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length > 0) {
            onImport(files);
          }
        }}
      />
      <button
        type="button"
        disabled={isImporting}
        onClick={() => fileInputRef.current?.click()}
        title="Add MP4 files from this computer to the library"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload className="size-4" aria-hidden="true" />
        {isImporting ? "Adding…" : "Add MP4"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-base font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete all
      </button>
    </div>
  );
}
