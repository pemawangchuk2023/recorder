"use client";

import { FolderDown, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { StorageMeter } from "@/app/library/_components/storage-meter";
import { backUpLibrary, canBackUpToFolder, type BackupProgress } from "@/app/library/_lib/backup-library";
import { formatTime } from "@/app/recorder/_lib/format-time";
import { formatBytes } from "@/lib/format-bytes";
import { deleteRecordings, type StorageInfo } from "@/lib/library/library";
import type { LibraryFolder, LibraryRecording } from "@/lib/library/types";

const LARGEST_SHOWN = 5;

interface StoragePanelProps {
  info: StorageInfo | null;
  recordings: LibraryRecording[];
  folders: LibraryFolder[];
  onMakePersistent: () => void;
}

const smallButton =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";

// Everything about the space recordings take: how much is left, what's using
// it, and a way to copy the whole library out to ordinary files.
export function StoragePanel({ info, recordings, folders, onMakePersistent }: StoragePanelProps) {
  const librarySize = recordings.reduce((total, recording) => total + recording.size, 0);
  const largest = [...recordings].sort((a, b) => b.size - a.size).slice(0, LARGEST_SHOWN);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [backup, setBackup] = useState<BackupProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runBackup = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setMessage(null);
    try {
      const result = await backUpLibrary(recordings, folders, setBackup, controller.signal);
      if (result) {
        setMessage(
          result.skipped.length > 0
            ? `Backed up ${result.written} of ${recordings.length} recordings to “${result.folderName}”. Couldn't read: ${result.skipped.join(", ")}.`
            : `Backed up ${result.written} recording${result.written === 1 ? "" : "s"} to “${result.folderName}”, with transcripts as .srt files.`
        );
      }
    } catch {
      setMessage(
        controller.signal.aborted
          ? "Backup stopped. The files already written are complete."
          : "The backup couldn't be finished — check the folder has enough free space and isn't read-only."
      );
    }
    abortRef.current = null;
    setBackup(null);
  };

  return (
    <section aria-label="Storage" className="flex flex-col gap-4">
      <StorageMeter info={info} librarySize={librarySize} onMakePersistent={onMakePersistent} />

      {recordings.length > 0 && (
        <details className="rounded-2xl border bg-card">
          <summary className="cursor-pointer list-none rounded-2xl px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Manage storage
            <span className="ml-2 font-normal text-muted-foreground">
              See what takes the most space, or back everything up
            </span>
          </summary>
          <div className="flex flex-col gap-5 border-t p-4">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Largest recordings</h3>
              <ul className="flex flex-col divide-y">
                {largest.map((recording) => {
                  const share = librarySize > 0 ? recording.size / librarySize : 0;
                  return (
                    <li key={recording.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
                      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-1">
                        <a href={`/library?v=${recording.id}`} className="truncate text-sm font-medium hover:underline">
                          {recording.title}
                        </a>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.max(2, share * 100)}%` }} />
                        </div>
                      </div>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatBytes(recording.size)} · {formatTime(Math.round(recording.duration))} · {Math.round(share * 100)}%
                      </span>
                      {confirmingId === recording.id ? (
                        <span role="alertdialog" aria-label={`Delete ${recording.title}?`} className="flex items-center gap-2">
                          <button type="button" autoFocus onClick={() => setConfirmingId(null)} className={smallButton}>
                            Keep
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingId(null);
                              void deleteRecordings([recording.id]);
                            }}
                            className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
                          >
                            Delete for good
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmingId(recording.id)}
                          className="grid size-9 place-items-center rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                          aria-label={`Delete ${recording.title}`}
                          title="Delete"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              {info && info.quota > 0 && (
                <p className="text-sm text-muted-foreground">
                  The browser lets this site use up to {formatBytes(info.quota)} — a share of your disk it
                  sets itself, which can&apos;t be raised from here. Each recording is stored once; a take
                  being recorded briefly needs the same space again.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">Back up to a folder</h3>
              {canBackUpToFolder() ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Copies every recording as an MP4 (with its transcript as an .srt file) into a folder
                    you choose on this computer. Clearing this site&apos;s data deletes the library, so a
                    backup is the only copy that survives that.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {backup ? (
                      <>
                        <button type="button" onClick={() => abortRef.current?.abort()} className={smallButton}>
                          Stop
                        </button>
                        <span role="status" className="text-sm tabular-nums text-muted-foreground">
                          Copying {Math.min(backup.done + 1, backup.total)} of {backup.total}
                          {backup.title ? `: ${backup.title}` : ""}
                        </span>
                      </>
                    ) : (
                      <button type="button" onClick={() => void runBackup()} className={smallButton}>
                        <FolderDown className="size-4" aria-hidden="true" />
                        Choose a folder and back up
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This browser can&apos;t write to a folder you pick (Chrome and Edge on a computer can). To
                  keep copies, download recordings one at a time from their menus.
                </p>
              )}
              {message && (
                <p role="status" className="text-sm font-medium">
                  {message}
                </p>
              )}
            </div>
          </div>
        </details>
      )}
    </section>
  );
}
