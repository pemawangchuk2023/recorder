"use client";

import { useState } from "react";
import { PageAdjust } from "@/app/scan/_components/page-adjust";
import { isConvex } from "@/app/scan/_lib/geometry";
import type { PageSettings } from "@/app/scan/_lib/process-page";
import { isStorageFull, updatePage, type ScanPage } from "@/app/scan/_lib/scans";

interface PageEditorProps {
  page: ScanPage;
  pageNumber: number;
  onClose: () => void;
}

// Changes a page that's already in a document.
export function PageEditor({ page, pageNumber, onClose }: PageEditorProps) {
  const [settings, setSettings] = useState<PageSettings>({
    corners: page.corners,
    filter: page.filter,
    turns: page.turns,
    brightness: page.brightness ?? 0,
    contrast: page.contrast ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updatePage(page, settings);
      onClose();
    } catch (cause) {
      setMessage(
        isStorageFull(cause)
          ? "Browser storage is full, so the change couldn't be saved. Delete scans or recordings you no longer need."
          : "The page couldn't be saved. Try again."
      );
      setSaving(false);
    }
  };

  return (
    <section aria-label={`Adjust page ${pageNumber}`} className="flex flex-col gap-5 rounded-3xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Adjust page {pageNumber}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border hover:bg-muted disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !isConvex(settings.corners)}
            className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save page"}
          </button>
        </div>
      </div>
      <PageAdjust photo={page.photo} settings={settings} onChange={setSettings} edgesFound={page.edgesFound} />
      {message && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {message}
        </p>
      )}
    </section>
  );
}
