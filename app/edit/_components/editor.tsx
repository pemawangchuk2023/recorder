"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EditorWorkspace } from "@/app/edit/_components/editor-workspace";
import { useLibrary } from "@/app/library/_hooks/use-library";
import { useStoredBlob } from "@/app/library/_hooks/use-stored-blob";
import { getRecordingVideo } from "@/lib/library/library";
import { fileVersionOf, type LibraryRecording } from "@/lib/library/types";

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-3xl border bg-card p-6 text-base">
      <p>{children}</p>
      <Link href="/library" className="font-semibold underline underline-offset-2 hover:no-underline">
        Go to your library
      </Link>
    </div>
  );
}

function LoadedEditor({ recording }: { recording: LibraryRecording }) {
  const { blob, loaded } = useStoredBlob(recording.id, fileVersionOf(recording), getRecordingVideo);
  if (!loaded) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-label="Loading the recording" />
      </div>
    );
  }
  if (!blob) {
    return <Message>This recording&apos;s video couldn&apos;t be read from browser storage.</Message>;
  }
  if (!(recording.duration > 0)) {
    return <Message>This recording is empty, so there is nothing to edit.</Message>;
  }
  // A new key when the stored file changes, so the editor starts afresh.
  return <EditorWorkspace key={`${recording.id}:${fileVersionOf(recording)}`} recording={recording} video={blob} />;
}

// Opens the recording named in the URL (?v=…) from this browser's library.
export function Editor() {
  const id = useSearchParams().get("v");
  const library = useLibrary();

  if (library.status === "loading") {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-label="Opening your library" />
      </div>
    );
  }
  if (library.status === "error") {
    return <Message>{library.message}</Message>;
  }
  const recording = id ? library.recordings.find((each) => each.id === id) : undefined;
  if (!recording) {
    return (
      <Message>
        {id
          ? "That recording isn't in this browser's library — it may have been deleted."
          : "Choose a recording to edit: open it in your library and press Edit."}
      </Message>
    );
  }
  return <LoadedEditor recording={recording} />;
}
