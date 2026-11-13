"use client";

import { LifeBuoy } from "lucide-react";
import { useEffect, useState } from "react";
import { saveRecording } from "@/app/recorder/_lib/save-recording";
import { formatBytes } from "@/lib/format-bytes";
import { formatRecordedAt } from "@/lib/format-date";
import { addRecording, isQuotaError } from "@/lib/library/library";
import { isLibraryAvailable } from "@/lib/library/recordings-db";
import { defaultRecordingTitle, titleToFilename } from "@/lib/library/titles";
import {
  deleteTake,
  findRecoverableTakes,
  recoverTake,
  type RecoverableTake,
} from "@/lib/takes/take-files";

type Busy = { name: string; action: "save" | "download" | "delete" };

const button =
  "rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

function recoveredTitle(take: RecoverableTake): string {
  return `${defaultRecordingTitle(new Date(take.startedAt))} (recovered)`;
}

// Offers back recordings that were interrupted: the tab crashed or was
// closed, or the library was full when the take finished.
export function RecoveryBanner() {
  const [takes, setTakes] = useState<RecoverableTake[]>([]);
  const [busy, setBusy] = useState<Busy | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    findRecoverableTakes()
      .then((found) => {
        if (!cancelled) {
          setTakes(found);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (takes.length === 0) {
    return message ? (
      <p role="status" className="rounded-2xl border bg-card px-5 py-4 text-base text-muted-foreground">
        {message}
      </p>
    ) : null;
  }

  const forget = (name: string) => setTakes((previous) => previous.filter((take) => take.name !== name));

  const run = async (take: RecoverableTake, action: Busy["action"]) => {
    setBusy({ name: take.name, action });
    setMessage(null);
    try {
      if (action === "delete") {
        await deleteTake(take.name);
        forget(take.name);
        setMessage("The unfinished recording was deleted.");
      } else if (action === "save") {
        const video = await recoverTake(take.name);
        await addRecording({ title: recoveredTitle(take), video, transcript: [], chapters: [] });
        await deleteTake(take.name);
        forget(take.name);
        setMessage("Recovered — the recording is in your library now.");
      } else {
        const video = await recoverTake(take.name);
        const result = await saveRecording(video, titleToFilename(recoveredTitle(take), "mp4"));
        setMessage(
          result === "cancelled"
            ? null
            : "Downloaded. Once you've checked the file, you can delete the unfinished recording here."
        );
      }
    } catch (cause) {
      setMessage(
        isQuotaError(cause)
          ? "There isn't enough browser storage to add it to the library. Download it instead, or delete some recordings first."
          : action === "delete"
            ? "It couldn't be deleted. Reload the page and try again."
            : "This recording couldn't be read — it may have been interrupted before any video was written."
      );
    }
    setBusy(null);
    setConfirmingDelete(null);
  };

  return (
    <section
      aria-label="Unfinished recordings"
      className="flex flex-col gap-4 rounded-3xl border border-sky-300 bg-sky-50 p-5 text-sky-950 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-100"
    >
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">
            {takes.length === 1 ? "A recording was interrupted" : `${takes.length} recordings were interrupted`}
          </h2>
          <p className="text-sm opacity-90">
            The recorder keeps each take on this device while it records, so it survived. Captions
            and chapters from an interrupted take aren&apos;t kept, and up to the last 10 seconds
            may be missing.
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {takes.map((take) => {
          const isBusy = busy?.name === take.name;
          return (
            <li
              key={take.name}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background/70 px-4 py-3"
            >
              <span className="text-sm font-medium">
                {formatRecordedAt(take.startedAt)} · {formatBytes(take.size)}
              </span>
              {confirmingDelete === take.name ? (
                <span role="alertdialog" aria-label="Delete this unfinished recording?" className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Delete it for good?</span>
                  <button type="button" autoFocus onClick={() => setConfirmingDelete(null)} className={`${button} ring-1 ring-border hover:bg-muted`}>
                    Keep
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(take, "delete")}
                    className={`${button} bg-red-600 text-white hover:bg-red-500`}
                  >
                    Delete
                  </button>
                </span>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setConfirmingDelete(take.name)}
                    className={`${button} text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-950`}
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(take, "download")}
                    className={`${button} ring-1 ring-border hover:bg-muted`}
                  >
                    {isBusy && busy.action === "download" ? "Preparing…" : "Download"}
                  </button>
                  {isLibraryAvailable() && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void run(take, "save")}
                      className={`${button} bg-sky-700 text-white hover:bg-sky-600`}
                    >
                      {isBusy && busy.action === "save" ? "Recovering…" : "Recover to library"}
                    </button>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {message && (
        <p role="status" className="text-sm font-medium">
          {message}
        </p>
      )}
    </section>
  );
}
