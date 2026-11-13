"use client";

import { FolderInput, Trash2, X } from "lucide-react";
import { useState } from "react";
import { formatBytes } from "@/lib/format-bytes";
import { deleteRecordings, moveRecordings } from "@/lib/library/library";
import type { LibraryFolder, LibraryRecording } from "@/lib/library/types";

interface SelectionBarProps {
  selected: LibraryRecording[];
  // How many recordings are showing, for "Select all".
  shownCount: number;
  folders: LibraryFolder[];
  onSelectAll: () => void;
  onDone: () => void;
}

const button =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40";

// Actions on several recordings at once: move to a folder, or delete.
export function SelectionBar({ selected, shownCount, folders, onSelectAll, onDone }: SelectionBarProps) {
  const [confirming, setConfirming] = useState(false);
  const ids = selected.map((recording) => recording.id);
  const size = selected.reduce((total, recording) => total + recording.size, 0);
  const none = selected.length === 0;

  if (confirming) {
    return (
      <div
        role="alertdialog"
        aria-labelledby="delete-selected-question"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/50"
      >
        <p id="delete-selected-question" className="text-base font-medium text-red-900 dark:text-red-100">
          Delete {selected.length} recording{selected.length === 1 ? "" : "s"} ({formatBytes(size)}) from this
          browser? This can&apos;t be undone.
        </p>
        <div className="flex gap-2">
          <button type="button" autoFocus onClick={() => setConfirming(false)} className={`${button} bg-background ring-1 ring-border hover:bg-muted`}>
            Keep them
          </button>
          <button
            type="button"
            onClick={async () => {
              await deleteRecordings(ids);
              setConfirming(false);
              onDone();
            }}
            className={`${button} bg-red-600 text-white hover:bg-red-500`}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-20 z-10 flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 shadow-md">
      <p role="status" className="px-2 text-base font-semibold tabular-nums">
        {selected.length} selected
        {!none && <span className="ml-2 font-normal text-muted-foreground">{formatBytes(size)}</span>}
      </p>
      <button
        type="button"
        onClick={onSelectAll}
        disabled={selected.length === shownCount}
        className={`${button} ring-1 ring-border hover:bg-muted`}
      >
        Select all {shownCount}
      </button>
      <label className="inline-flex items-center gap-2 text-sm font-semibold">
        <FolderInput className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Move selected recordings to</span>
        <select
          value=""
          disabled={none}
          onChange={async (event) => {
            const target = event.target.value;
            if (target) {
              await moveRecordings(ids, target === "none" ? null : target);
              onDone();
            }
          }}
          className="rounded-full border border-input bg-card px-3 py-2 text-sm disabled:opacity-40"
        >
          <option value="">Move to…</option>
          <option value="none">No folder</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={none}
        onClick={() => setConfirming(true)}
        className={`${button} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Delete
      </button>
      <button type="button" onClick={onDone} className={`${button} ml-auto text-muted-foreground hover:bg-muted hover:text-foreground`}>
        <X className="size-4" aria-hidden="true" />
        Done
      </button>
    </div>
  );
}
