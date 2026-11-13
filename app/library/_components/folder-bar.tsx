"use client";

import { Folder, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FolderFilter } from "@/app/library/_lib/filter-recordings";
import {
  MAX_FOLDER_NAME_LENGTH,
  createFolder,
  deleteFolder,
  renameFolder,
} from "@/lib/library/library";
import type { LibraryFolder, LibraryRecording } from "@/lib/library/types";
import { cn } from "@/lib/utils";

interface FolderBarProps {
  folders: LibraryFolder[];
  recordings: LibraryRecording[];
  selected: FolderFilter;
  onSelect: (folder: FolderFilter) => void;
}

const chip =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function NameInput({
  label,
  initial,
  onSubmit,
  onCancel,
}: {
  label: string;
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  return (
    <form
      className="inline-flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(name);
      }}
    >
      <input
        autoFocus
        aria-label={label}
        value={name}
        maxLength={MAX_FOLDER_NAME_LENGTH}
        placeholder="Folder name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
        className="w-44 rounded-full border border-input bg-card px-4 py-2 text-sm"
      />
      <button type="submit" disabled={!name.trim()} className={cn(chip, "bg-foreground text-background disabled:opacity-40")}>
        Save
      </button>
      <button type="button" onClick={onCancel} className={cn(chip, "text-muted-foreground hover:bg-muted")}>
        Cancel
      </button>
    </form>
  );
}

// Folder tabs above the grid: pick one to see only its recordings.
export function FolderBar({ folders, recordings, selected, onSelect }: FolderBarProps) {
  const [mode, setMode] = useState<"idle" | "creating" | "renaming" | "deleting">("idle");
  const current = selected.kind === "folder" ? folders.find((folder) => folder.id === selected.id) : undefined;
  const countIn = (id: string) => recordings.filter((recording) => recording.folderId === id).length;
  const unfiled = recordings.filter((recording) => !recording.folderId).length;

  const tab = (key: string, label: string, count: number, filter: FolderFilter, active: boolean, icon = false) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => {
        setMode("idle");
        onSelect(filter);
      }}
      className={cn(chip, active ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70")}
    >
      {icon && <Folder className="size-4" aria-hidden="true" />}
      <span className="max-w-40 truncate">{label}</span>
      <span className={cn("tabular-nums", active ? "opacity-70" : "text-muted-foreground")}>{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Folders" className="flex flex-wrap items-center gap-2">
          {tab("all", "All", recordings.length, { kind: "all" }, selected.kind === "all")}
          {folders.length > 0 && tab("unfiled", "No folder", unfiled, { kind: "unfiled" }, selected.kind === "unfiled")}
          {folders.map((folder) =>
            tab(folder.id, folder.name, countIn(folder.id), { kind: "folder", id: folder.id }, current?.id === folder.id, true)
          )}
        </div>
        {mode === "creating" ? (
          <NameInput
            label="New folder name"
            initial=""
            onCancel={() => setMode("idle")}
            onSubmit={async (name) => {
              const folder = await createFolder(name);
              setMode("idle");
              if (folder) {
                onSelect({ kind: "folder", id: folder.id });
              }
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setMode("creating")}
            className={cn(chip, "text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground")}
          >
            <FolderPlus className="size-4" aria-hidden="true" />
            New folder
          </button>
        )}
      </div>

      {current && mode === "renaming" && (
        <NameInput
          label={`Rename ${current.name}`}
          initial={current.name}
          onCancel={() => setMode("idle")}
          onSubmit={async (name) => {
            await renameFolder(current, name);
            setMode("idle");
          }}
        />
      )}
      {current && mode === "deleting" && (
        <div
          role="alertdialog"
          aria-labelledby="delete-folder-question"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4"
        >
          <p id="delete-folder-question" className="text-base font-medium">
            Remove the folder “{current.name}”? Its {countIn(current.id)} recording
            {countIn(current.id) === 1 ? " is" : "s are"} kept and moved to “No folder”.
          </p>
          <div className="flex gap-2">
            <button type="button" autoFocus onClick={() => setMode("idle")} className={cn(chip, "ring-1 ring-border hover:bg-muted")}>
              Keep folder
            </button>
            <button
              type="button"
              onClick={async () => {
                await deleteFolder(current.id);
                setMode("idle");
                onSelect({ kind: "all" });
              }}
              className={cn(chip, "bg-red-600 text-white hover:bg-red-500")}
            >
              Remove folder
            </button>
          </div>
        </div>
      )}
      {current && mode === "idle" && (
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <span className="mr-1">Folder “{current.name}”:</span>
          <button type="button" onClick={() => setMode("renaming")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium hover:bg-muted hover:text-foreground">
            <Pencil className="size-3.5" aria-hidden="true" />
            Rename
          </button>
          <button type="button" onClick={() => setMode("deleting")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium hover:bg-muted hover:text-foreground">
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove folder
          </button>
        </div>
      )}
    </div>
  );
}
