"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyLibrary } from "@/app/library/_components/empty-library";
import { FolderBar } from "@/app/library/_components/folder-bar";
import { LibraryToolbar } from "@/app/library/_components/library-toolbar";
import { RecordingCard } from "@/app/library/_components/recording-card";
import { SelectionBar } from "@/app/library/_components/selection-bar";
import { StoragePanel } from "@/app/library/_components/storage-panel";
import { WatchView } from "@/app/library/_components/watch-view";
import { useLibrary } from "@/app/library/_hooks/use-library";
import { useStorageInfo } from "@/app/library/_hooks/use-storage-info";
import {
  ALL_FOLDERS,
  filterRecordings,
  matchingLine,
  type FolderFilter,
} from "@/app/library/_lib/filter-recordings";
import { importVideos } from "@/app/library/_lib/import-videos";
import { RecoveryBanner } from "@/app/recorder/_components/recovery-banner";
import type { LibrarySort } from "@/constants/recorder";
import { deleteRecordings } from "@/lib/library/library";

export function Library() {
  const library = useLibrary();
  const recordings = library.status === "ready" ? library.recordings : [];
  const folders = library.status === "ready" ? library.folders : [];
  const storage = useStorageInfo(recordings);
  const router = useRouter();
  const watchingId = useSearchParams().get("v");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [chosenFolder, setFolder] = useState<FolderFilter>(ALL_FOLDERS);
  // Null when recordings aren't being selected.
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  if (library.status === "loading") {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-label="Loading your library" />
      </div>
    );
  }
  if (library.status === "error") {
    return (
      <p role="alert" className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-base text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        {library.message}
      </p>
    );
  }

  const watching = watchingId ? recordings.find((recording) => recording.id === watchingId) : undefined;
  if (watching) {
    return <WatchView key={watching.id} recording={watching} onDeleted={() => router.replace("/library")} />;
  }

  // A folder deleted in another tab falls back to showing everything.
  const folder: FolderFilter =
    chosenFolder.kind === "folder" && !folders.some((each) => each.id === chosenFolder.id)
      ? ALL_FOLDERS
      : chosenFolder;
  const shown = filterRecordings(recordings, query, sort, folder);
  const selected = selectedIds ? shown.filter((recording) => selectedIds.has(recording.id)) : [];

  const toggleSelected = (id: string) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  const handleImport = async (files: File[]) => {
    setIsImporting(true);
    setImportMessage(null);
    const result = await importVideos(files, folder.kind === "folder" ? folder.id : null);
    setIsImporting(false);
    const parts = [
      result.added > 0 ? `Added ${result.added} video${result.added === 1 ? "" : "s"}.` : null,
      result.rejected.length > 0
        ? `Not MP4 video, so left out: ${result.rejected.join(", ")}. The Converter can turn other formats into MP4.`
        : null,
      result.full ? "Browser storage is full — the rest weren't added. Free up space below and try again." : null,
    ].filter(Boolean);
    setImportMessage(parts.join(" ") || null);
  };

  return (
    <div className="flex flex-col gap-6">
      <RecoveryBanner />
      {watchingId && (
        <p role="status" className="rounded-2xl border bg-card px-5 py-4 text-base text-muted-foreground">
          That recording isn&apos;t in this browser&apos;s library — it may have been deleted.
        </p>
      )}
      {recordings.length === 0 ? (
        <>
          <EmptyLibrary />
          <label className="cursor-pointer self-center rounded-full px-4 py-2 text-base font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground focus-within:outline-2 focus-within:outline-ring">
            {isImporting ? "Adding…" : "Or add MP4 files from this computer"}
            <input
              type="file"
              accept="video/mp4,.mp4,.m4v,.mov"
              multiple
              disabled={isImporting}
              className="sr-only"
              onChange={(event) => {
                const files = [...(event.target.files ?? [])];
                event.target.value = "";
                if (files.length > 0) {
                  void handleImport(files);
                }
              }}
            />
          </label>
          {importMessage && (
            <p role="status" className="rounded-2xl border bg-card px-5 py-3 text-base">
              {importMessage}
            </p>
          )}
        </>
      ) : (
        <>
          {selectedIds ? (
            <SelectionBar
              selected={selected}
              shownCount={shown.length}
              folders={folders}
              onSelectAll={() => setSelectedIds(new Set(shown.map((recording) => recording.id)))}
              onDone={() => setSelectedIds(null)}
            />
          ) : (
            <LibraryToolbar
              query={query}
              onQueryChange={setQuery}
              sort={sort}
              onSortChange={setSort}
              count={recordings.length}
              onDeleteAll={() => void deleteRecordings("all")}
              onSelect={() => setSelectedIds(new Set())}
              onImport={(files) => void handleImport(files)}
              isImporting={isImporting}
            />
          )}
          {importMessage && (
            <p role="status" className="rounded-2xl border bg-card px-5 py-3 text-base">
              {importMessage}
            </p>
          )}
          <FolderBar folders={folders} recordings={recordings} selected={folder} onSelect={setFolder} />
          {shown.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((recording) => (
                <li key={recording.id}>
                  <RecordingCard
                    recording={recording}
                    folders={folders}
                    selected={selectedIds ? selectedIds.has(recording.id) : null}
                    onToggleSelected={() => toggleSelected(recording.id)}
                    match={matchingLine(recording, query)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-12 text-center text-base text-muted-foreground">
              {query.trim()
                ? `No recordings match “${query.trim()}”${folder.kind === "all" ? "" : " in this folder"}.`
                : "This folder is empty. Move recordings here from their ⋮ menu, or with Select."}
            </p>
          )}
        </>
      )}
      <StoragePanel
        info={storage.info}
        recordings={recordings}
        folders={folders}
        onMakePersistent={() => void storage.makePersistent()}
      />
    </div>
  );
}
