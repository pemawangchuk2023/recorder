"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { YouTubeReadyPanel } from "@/app/_components/youtube/youtube-ready-panel";
import { useStoredBlob } from "@/app/library/_hooks/use-stored-blob";
import { ChaptersPanel } from "@/app/recorder/_components/chapters-panel";
import { ExportPanel } from "@/app/recorder/_components/export-panel";
import { PlayerTools } from "@/app/recorder/_components/player-tools";
import { RecordingActions } from "@/app/recorder/_components/recording-actions";
import { RecordingTitle } from "@/app/recorder/_components/recording-title";
import { TranscriptPanel } from "@/app/recorder/_components/transcript-panel";
import { useObjectUrl } from "@/app/recorder/_hooks/use-object-url";
import { formatTime } from "@/app/recorder/_lib/format-time";
import type { Chapter } from "@/app/recorder/_lib/types";
import { formatBytes } from "@/lib/format-bytes";
import { formatRecordedAt } from "@/lib/format-date";
import {
  deleteRecordings,
  getRecordingVideo,
  renameRecording,
  updateRecording,
} from "@/lib/library/library";
import { titleToFilename } from "@/lib/library/titles";
import { fileVersionOf, type LibraryRecording } from "@/lib/library/types";

interface WatchViewProps {
  recording: LibraryRecording;
  onDeleted: () => void;
}

export function WatchView({ recording, onDeleted }: WatchViewProps) {
  const playbackRef = useRef<HTMLVideoElement>(null);
  // Edited here and written through, so typing never waits on storage.
  const [chapters, setChapters] = useState<Chapter[]>(recording.chapters ?? []);
  const changeChapters = (next: Chapter[]) => {
    setChapters(next);
    void updateRecording(recording.id, { chapters: next });
  };
  const { blob, loaded } = useStoredBlob(recording.id, fileVersionOf(recording), getRecordingVideo);
  const url = useObjectUrl(blob);
  const filename = titleToFilename(recording.title, "mp4");
  const baseName = filename.replace(/\.mp4$/, "");

  const details = [
    formatRecordedAt(recording.createdAt),
    formatTime(Math.round(recording.duration)),
    formatBytes(recording.size),
    recording.height ? `${recording.width}×${recording.height}` : null,
    recording.codec ? `${recording.codec} MP4` : "MP4",
  ].filter(Boolean);

  const handleDelete = async () => {
    await deleteRecordings([recording.id]);
    onDeleted();
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/library"
        className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 -ml-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All recordings
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-black shadow-lg ring-1 ring-zinc-900/10 dark:ring-white/10">
            {url ? (
              <video
                ref={playbackRef}
                src={url}
                controls
                autoPlay
                playsInline
                className="size-full object-contain"
              />
            ) : (
              <div className="grid size-full place-items-center text-zinc-400">
                {loaded ? (
                  <p className="text-base">This video couldn&apos;t be loaded from browser storage.</p>
                ) : (
                  <Loader2 className="size-8 animate-spin" aria-label="Loading video" />
                )}
              </div>
            )}
          </div>
          {url && <PlayerTools playbackRef={playbackRef} baseName={baseName} />}

          <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-1.5">
              <RecordingTitle
                title={recording.title}
                onRename={(title) => void renameRecording(recording.id, title)}
                className="text-2xl"
              />
              <p className="text-sm text-muted-foreground">{details.join(" · ")}</p>
            </div>
            {blob && (
              <RecordingActions
                blob={blob}
                filename={filename}
                onDelete={handleDelete}
                deleteQuestion="Delete this recording from your library? It can't be recovered."
              />
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-6 rounded-3xl border bg-card p-5 sm:p-6">
          {recording.transcript.length > 0 ? (
            <TranscriptPanel
              segments={recording.transcript}
              baseName={baseName}
              playbackRef={playbackRef}
              defaultOpen
            />
          ) : (
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold">Transcript</h3>
              <p className="text-sm text-muted-foreground">
                This recording has no transcript. Turn on live captions before recording to get one.
              </p>
            </div>
          )}
          <ChaptersPanel
            chapters={chapters}
            duration={recording.duration}
            playbackRef={playbackRef}
            onChange={changeChapters}
          />
          {blob && <ExportPanel blob={blob} baseName={baseName} />}
        </aside>
      </div>

      {blob && (
        <div className="rounded-3xl border bg-card p-5 sm:p-6 lg:max-w-[calc(100%-23.5rem)]">
          <YouTubeReadyPanel
            video={blob}
            title={recording.title}
            baseName={baseName}
            duration={recording.duration}
            codec={recording.codec}
            width={recording.width}
            height={recording.height}
            transcript={recording.transcript}
            chapters={chapters}
            playbackRef={playbackRef}
          />
        </div>
      )}
    </div>
  );
}
