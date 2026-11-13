"use client";

import { Scissors } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { LibrarySave } from "@/app/recorder/_hooks/use-library-save";

// A link from a finished take to the editor, once the take is in the library
// (the editor works on library recordings).
export function OpenInEditor({ library }: { library: LibrarySave }) {
  const [id, setId] = useState<string | null>(null);
  const getId = library.id;

  useEffect(() => {
    let cancelled = false;
    void getId().then((found) => {
      if (!cancelled) {
        setId(found);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [getId, library.status]);

  if (!id || library.status !== "saved") {
    return null;
  }
  return (
    <Link
      href={`/edit?v=${id}`}
      className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-base font-semibold ring-1 ring-border transition-colors hover:bg-muted"
    >
      <Scissors className="size-4" aria-hidden="true" />
      Edit: cut, crop, annotate
    </Link>
  );
}
