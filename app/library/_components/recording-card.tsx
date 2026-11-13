"use client";

import { Check, Download, EllipsisVertical, FolderInput, Pencil, Play, Scissors, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { VideoThumbnail } from "@/app/library/_components/video-thumbnail";
import { downloadRecording } from "@/app/library/_lib/download-recording";
import { formatTime } from "@/app/recorder/_lib/format-time";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes } from "@/lib/format-bytes";
import { formatRecordedAt } from "@/lib/format-date";
import { deleteRecordings, moveRecordings, renameRecording } from "@/lib/library/library";
import { thumbnailVersionOf, type LibraryFolder, type LibraryRecording } from "@/lib/library/types";
import { cn } from "@/lib/utils";

interface RecordingCardProps {
  recording: LibraryRecording;
  folders: LibraryFolder[];
  // Null when recordings aren't being selected.
  selected: boolean | null;
  onToggleSelected: () => void;
  // A line of the transcript that matched the search, if any.
  match: { time: number; text: string } | null;
}

export function RecordingCard({ recording, folders, selected, onToggleSelected, match }: RecordingCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [draftTitle, setDraftTitle] = useState<string | null>(null);
  const href = `/library?v=${recording.id}`;
  const isVertical = recording.width !== null && recording.height !== null && recording.height > recording.width;
  const folder = folders.find((each) => each.id === recording.folderId);
  const selecting = selected !== null;

  const commitTitle = () => {
    if (draftTitle !== null && draftTitle.trim()) {
      void renameRecording(recording.id, draftTitle);
    }
    setDraftTitle(null);
  };

  const thumbnail = (
    <>
      <VideoThumbnail id={recording.id} version={thumbnailVersionOf(recording)} />
      <span className="absolute right-2 bottom-2 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
        {formatTime(Math.round(recording.duration))}
      </span>
    </>
  );

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring",
        selected && "ring-2 ring-brand"
      )}
    >
      {selecting ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label={`Select ${recording.title}`}
          onClick={onToggleSelected}
          className="relative block text-left outline-none"
        >
          {thumbnail}
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-2 left-2 grid size-7 place-items-center rounded-full border-2 shadow",
              selected ? "border-brand bg-brand text-brand-foreground" : "border-white bg-black/40 text-transparent"
            )}
          >
            <Check className="size-4" />
          </span>
        </button>
      ) : (
        <Link href={href} className="relative block outline-none" aria-label={`Watch ${recording.title}`}>
          {thumbnail}
          <span
            aria-hidden="true"
            className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
          >
            <span className="grid size-14 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-lg">
              <Play className="ml-0.5 size-6 fill-current" />
            </span>
          </span>
        </Link>
      )}

      <div className="flex items-start gap-2 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {draftTitle !== null ? (
            <input
              autoFocus
              aria-label="Recording title"
              value={draftTitle}
              maxLength={120}
              onChange={(event) => setDraftTitle(event.target.value)}
              onFocus={(event) => event.target.select()}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitTitle();
                } else if (event.key === "Escape") {
                  setDraftTitle(null);
                }
              }}
              className="w-full min-w-0 rounded-lg border border-input bg-background px-2 py-1 text-base font-semibold"
            />
          ) : (
            <Link href={href} className="truncate text-base font-semibold hover:underline" title={recording.title}>
              {recording.title}
            </Link>
          )}
          <p className="text-sm text-muted-foreground">
            {formatRecordedAt(recording.createdAt)} · {formatBytes(recording.size)}
          </p>
          {match && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              <span className="font-semibold tabular-nums text-foreground">{formatTime(Math.floor(match.time))}</span>{" "}
              “{match.text}”
            </p>
          )}
          {(isVertical || folder) && (
            <div className="flex flex-wrap gap-1.5">
              {folder && (
                <span className="max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                  {folder.name}
                </span>
              )}
              {isVertical && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">Vertical 9:16</span>
              )}
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Actions for ${recording.title}`}
          >
            <EllipsisVertical className="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem asChild>
              <Link href={`/edit?v=${recording.id}`}>
                <Scissors aria-hidden="true" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              // Wait for the menu to close, or it takes the focus back from the field.
              onSelect={() => setTimeout(() => setDraftTitle(recording.title), 150)}
            >
              <Pencil aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput aria-hidden="true" />
                Move to
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-72 min-w-44 overflow-y-auto">
                <DropdownMenuItem
                  disabled={!recording.folderId}
                  onSelect={() => void moveRecordings([recording.id], null)}
                >
                  No folder
                </DropdownMenuItem>
                {folders.length > 0 && <DropdownMenuSeparator />}
                {folders.map((each) => (
                  <DropdownMenuItem
                    key={each.id}
                    disabled={each.id === recording.folderId}
                    onSelect={() => void moveRecordings([recording.id], each.id)}
                  >
                    <span className="truncate">{each.name}</span>
                  </DropdownMenuItem>
                ))}
                {folders.length === 0 && (
                  <p className="max-w-52 px-2 py-1.5 text-sm text-muted-foreground">
                    Create a folder with “New folder” above the recordings first.
                  </p>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => void downloadRecording(recording)}>
              <Download aria-hidden="true" />
              Download MP4
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmingDelete(true)}>
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {confirmingDelete && (
        <div
          role="alertdialog"
          aria-label={`Delete ${recording.title}?`}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card/95 p-6 text-center backdrop-blur-sm"
        >
          <p className="text-base font-semibold">Delete this recording?</p>
          <p className="-mt-2 text-sm text-muted-foreground">It&apos;s removed from this browser for good.</p>
          <div className="flex gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmingDelete(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border hover:bg-muted"
            >
              Keep
            </button>
            <button
              type="button"
              onClick={() => void deleteRecordings([recording.id])}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
