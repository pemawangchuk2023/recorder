"use client";

import { Film } from "lucide-react";
import { useStoredBlob } from "@/app/library/_hooks/use-stored-blob";
import { useObjectUrl } from "@/app/recorder/_hooks/use-object-url";
import { getRecordingThumbnail } from "@/lib/library/library";
import { cn } from "@/lib/utils";

export function VideoThumbnail({
  id,
  version,
  className,
}: {
  id: string;
  // Changes whenever the video is replaced, so the thumbnail reloads.
  version: number;
  className?: string;
}) {
  const { blob, loaded } = useStoredBlob(id, version, getRecordingThumbnail);
  const url = useObjectUrl(blob);

  return (
    <div className={cn("relative aspect-video overflow-hidden bg-zinc-900", className)}>
      {url ? (
        // A local object URL: next/image can't optimise it.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-contain" />
      ) : (
        <div className={cn("grid size-full place-items-center text-zinc-600", !loaded && "animate-pulse")}>
          <Film className="size-10" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
