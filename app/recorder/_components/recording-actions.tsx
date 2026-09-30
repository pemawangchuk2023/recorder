"use client";

import { Download, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  canShareFile,
  saveRecording,
  shareFile,
  type SaveResult,
} from "@/app/recorder/_lib/save-recording";

interface RecordingActionsProps {
  blob: Blob;
  filename: string;
  // Deletes the recording; the question is asked first.
  onDelete: () => Promise<void> | void;
  deleteQuestion: string;
}

const RESULT_TEXT: Record<SaveResult, string> = {
  saved: "Saved.",
  downloaded: "Downloaded.",
  cancelled: "Save cancelled.",
};

const pill =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const secondary = `${pill} ring-1 ring-border hover:bg-muted`;

// Download, share and delete — the same buttons after recording and in the library.
export function RecordingActions({ blob, filename, onDelete, deleteQuestion }: RecordingActionsProps) {
  const file = useMemo(() => new File([blob], filename, { type: blob.type || "video/mp4" }), [blob, filename]);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setResult(null);
    setResult(await saveRecording(blob, file.name));
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  if (confirmingDelete) {
    return (
      <div role="alertdialog" aria-labelledby="delete-question" className="flex flex-wrap items-center gap-3">
        <p id="delete-question" className="text-base font-medium">
          {deleteQuestion}
        </p>
        <button type="button" onClick={() => setConfirmingDelete(false)} className={secondary} autoFocus>
          Keep it
        </button>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={isDeleting}
          className={`${pill} bg-red-600 text-white hover:bg-red-500`}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {result && (
        <span className="mr-1 text-sm text-muted-foreground" role="status">
          {RESULT_TEXT[result]}
        </span>
      )}
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className={`${secondary} text-red-600 dark:text-red-400`}
        aria-label="Delete recording"
        title="Delete"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
      {canShareFile(file) && (
        <button type="button" onClick={() => void shareFile(file)} className={secondary}>
          <Share2 className="size-4" aria-hidden="true" />
          Share…
        </button>
      )}
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving}
        className={`${pill} bg-red-600 text-white shadow-sm shadow-red-600/30 hover:bg-red-500`}
      >
        <Download className="size-4" aria-hidden="true" />
        {isSaving ? "Saving…" : "Download MP4"}
      </button>
    </div>
  );
}
