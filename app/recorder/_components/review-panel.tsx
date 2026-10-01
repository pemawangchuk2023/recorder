"use client";

import type { RefObject } from "react";
import { YouTubeReadyPanel } from "@/app/_components/youtube/youtube-ready-panel";
import { ChaptersPanel } from "@/app/recorder/_components/chapters-panel";
import { ExportPanel } from "@/app/recorder/_components/export-panel";
import { LibraryStatus } from "@/app/recorder/_components/library-status";
import { PlayerTools } from "@/app/recorder/_components/player-tools";
import { RecordingActions } from "@/app/recorder/_components/recording-actions";
import { RecordingTitle } from "@/app/recorder/_components/recording-title";
import { TranscriptPanel } from "@/app/recorder/_components/transcript-panel";
import { TrimEditor } from "@/app/recorder/_components/trim-editor";
import type { LibrarySave } from "@/app/recorder/_hooks/use-library-save";
import { useRecordingInfo } from "@/app/recorder/_hooks/use-recording-info";
import { canTrimRecordings } from "@/app/recorder/_lib/edit-recording";
import { formatTime } from "@/app/recorder/_lib/format-time";
import type { Chapter, TranscriptSegment } from "@/app/recorder/_lib/types";
import { formatBytes } from "@/lib/format-bytes";
import { titleToFilename } from "@/lib/library/titles";

interface ReviewPanelProps {
  blob: Blob;
  transcript: TranscriptSegment[];
  chapters: Chapter[];
  onChaptersChange: (chapters: Chapter[]) => void;
  isTrimmed: boolean;
  playbackRef: RefObject<HTMLVideoElement | null>;
  onTrimmed: (blob: Blob, transcript: TranscriptSegment[], chapters: Chapter[]) => void;
  onUndoTrim: () => void;
  library: LibrarySave;
  // Called once the take is deleted from the library.
  onDeleted: () => void;
}

export function ReviewPanel({
  blob,
  transcript,
  chapters,
  onChaptersChange,
  isTrimmed,
  playbackRef,
  onTrimmed,
  onUndoTrim,
  library,
  onDeleted,
}: ReviewPanelProps) {
  const info = useRecordingInfo(blob);
  const filename = titleToFilename(library.title, "mp4");
  const baseName = filename.replace(/\.mp4$/, "");

  const details = [
    info ? formatTime(Math.round(info.duration)) : null,
    formatBytes(blob.size),
    info?.codec ? `${info.codec} MP4` : "MP4",
  ].filter(Boolean);

  const handleDelete = async () => {
    await library.remove();
    onDeleted();
  };

  return (
    <div className="flex flex-col gap-4">
      <PlayerTools playbackRef={playbackRef} baseName={baseName} />

      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
            <RecordingTitle title={library.title} onRename={library.rename} className="text-xl" />
            <p className="text-sm text-muted-foreground">
              {details.join(" · ")}
              {isTrimmed && (
                <>
                  {" · Trimmed "}
                  <button
                    type="button"
                    onClick={onUndoTrim}
                    className="font-medium underline underline-offset-2 hover:no-underline"
                  >
                    Undo
                  </button>
                </>
              )}
            </p>
            <LibraryStatus status={library.status} />
          </div>
          <RecordingActions
            blob={blob}
            filename={filename}
            onDelete={handleDelete}
            deleteQuestion="Delete this recording? It can't be recovered."
          />
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-3xl border bg-card p-5 sm:p-6">
        {info && info.duration > 1 && canTrimRecordings() && (
          <TrimEditor
            blob={blob}
            duration={info.duration}
            transcript={transcript}
            chapters={chapters}
            playbackRef={playbackRef}
            onTrimmed={onTrimmed}
          />
        )}
        {info && (
          <ChaptersPanel
            chapters={chapters}
            duration={info.duration}
            playbackRef={playbackRef}
            onChange={onChaptersChange}
          />
        )}
        {transcript.length > 0 && (
          <TranscriptPanel segments={transcript} baseName={baseName} playbackRef={playbackRef} />
        )}
        <ExportPanel blob={blob} baseName={baseName} />
      </div>

      {info && (
        <div className="rounded-3xl border bg-card p-5 sm:p-6">
          <YouTubeReadyPanel
            video={blob}
            title={library.title}
            baseName={baseName}
            duration={info.duration}
            codec={info.codec}
            width={info.width}
            height={info.height}
            transcript={transcript}
            chapters={chapters}
            playbackRef={playbackRef}
          />
        </div>
      )}
    </div>
  );
}
