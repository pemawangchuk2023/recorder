"use client";

import { Download, EllipsisVertical, Play, Trash2 } from "lucide-react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatBytes } from "@/lib/format-bytes";
import { formatRecordedAt } from "@/lib/format-date";
import { deleteRecordings } from "@/lib/library/library";
import { fileVersionOf, type LibraryRecording } from "@/lib/library/types";

export function RecordingCard({ recording }: { recording: LibraryRecording }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const href = `/library?v=${recording.id}`;
  const isVertical = recording.width !== null && recording.height !== null && recording.height > recording.width;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
      <Link href={href} className="relative block outline-none" aria-label={`Watch ${recording.title}`}>
        <VideoThumbnail id={recording.id} version={fileVersionOf(recording)} />
        <span className="absolute right-2 bottom-2 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-white">
          {formatTime(Math.round(recording.duration))}
        </span>
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100"
        >
          <span className="grid size-14 place-items-center rounded-full bg-white/90 text-zinc-900 shadow-lg">
            <Play className="ml-0.5 size-6 fill-current" />
          </span>
        </span>
      </Link>

      <div className="flex items-start gap-2 p-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link href={href} className="truncate text-base font-semibold hover:underline">
            {recording.title}
          </Link>
          <p className="text-sm text-muted-foreground">
            {formatRecordedAt(recording.createdAt)} · {formatBytes(recording.size)}
          </p>
          {isVertical && (
            <span className="self-start rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
              Vertical 9:16
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="-mr-2 grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`Actions for ${recording.title}`}
          >
            <EllipsisVertical className="size-5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
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
