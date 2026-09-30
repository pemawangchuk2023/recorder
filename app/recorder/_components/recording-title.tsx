"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";

// An inline, click-to-edit title. Saves on Enter or when focus leaves.
export function RecordingTitle({
  title,
  onRename,
  className,
}: {
  title: string;
  onRename: (title: string) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft !== null && draft.trim() && draft.trim() !== title) {
      onRename(draft.trim());
    }
    setDraft(null);
  };

  if (draft !== null) {
    return (
      <input
        autoFocus
        aria-label="Recording title"
        value={draft}
        maxLength={120}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          } else if (event.key === "Escape") {
            setDraft(null);
          }
        }}
        className={`w-full min-w-0 rounded-lg border border-input bg-background px-2 py-1 font-semibold ${className ?? ""}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setDraft(title)}
      className={`group/title flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 -mx-2 text-left font-semibold hover:bg-muted ${className ?? ""}`}
      title="Rename"
    >
      <span className="truncate">{title}</span>
      <Pencil
        className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/title:opacity-100 group-focus-visible/title:opacity-100"
        aria-hidden="true"
      />
      <span className="sr-only">Rename</span>
    </button>
  );
}
