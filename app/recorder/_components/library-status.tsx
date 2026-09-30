import { AlertTriangle, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import type { LibrarySaveStatus } from "@/app/recorder/_hooks/use-library-save";

// Whether the take made it into the browser's library.
export function LibraryStatus({ status }: { status: LibrarySaveStatus }) {
  if (status === "saving") {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Saving to your library…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
        <Check className="size-4" aria-hidden="true" />
        Saved in your{" "}
        <Link href="/library" className="font-semibold underline underline-offset-2 hover:no-underline">
          library
        </Link>
      </span>
    );
  }
  const message =
    status === "full"
      ? "Your browser's storage is full, so this take isn't in the library. Download it, or delete old recordings."
      : status === "unavailable"
        ? "This browser can't keep a library. Download the recording to keep it."
        : "Couldn't add this take to the library. Download it to keep it.";
  return (
    <span role="alert" className="inline-flex items-start gap-1.5 text-sm text-amber-700 dark:text-amber-400">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </span>
  );
}
