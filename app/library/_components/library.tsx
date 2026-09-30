"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyLibrary } from "@/app/library/_components/empty-library";
import { LibraryToolbar } from "@/app/library/_components/library-toolbar";
import { RecordingCard } from "@/app/library/_components/recording-card";
import { StorageMeter } from "@/app/library/_components/storage-meter";
import { WatchView } from "@/app/library/_components/watch-view";
import { useLibrary } from "@/app/library/_hooks/use-library";
import { useStorageInfo } from "@/app/library/_hooks/use-storage-info";
import { filterRecordings } from "@/app/library/_lib/filter-recordings";
import type { LibrarySort } from "@/constants/recorder";
import { deleteRecordings } from "@/lib/library/library";

export function Library() {
  const library = useLibrary();
  const recordings = library.status === "ready" ? library.recordings : [];
  const storage = useStorageInfo(recordings);
  const router = useRouter();
  const watchingId = useSearchParams().get("v");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<LibrarySort>("newest");

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

  const shown = filterRecordings(recordings, query, sort);
  const librarySize = recordings.reduce((total, recording) => total + recording.size, 0);

  return (
    <div className="flex flex-col gap-6">
      {watchingId && (
        <p role="status" className="rounded-2xl border bg-card px-5 py-4 text-base text-muted-foreground">
          That recording isn&apos;t in this browser&apos;s library — it may have been deleted.
        </p>
      )}
      {recordings.length === 0 ? (
        <EmptyLibrary />
      ) : (
        <>
          <LibraryToolbar
            query={query}
            onQueryChange={setQuery}
            sort={sort}
            onSortChange={setSort}
            count={recordings.length}
            onDeleteAll={() => void deleteRecordings("all")}
          />
          {shown.length > 0 ? (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((recording) => (
                <li key={recording.id}>
                  <RecordingCard recording={recording} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-12 text-center text-base text-muted-foreground">
              No recordings match “{query}”.
            </p>
          )}
        </>
      )}
      <StorageMeter info={storage.info} librarySize={librarySize} onMakePersistent={() => void storage.makePersistent()} />
    </div>
  );
}
