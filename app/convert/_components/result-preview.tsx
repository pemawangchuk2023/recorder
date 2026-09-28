"use client";

import { useObjectUrl } from "@/app/recorder/_hooks/use-object-url";

export function ResultPreview({ blob }: { blob: Blob }) {
  const url = useObjectUrl(blob);
  if (!url) {
    return null;
  }
  if (blob.type.startsWith("image/")) {
    // eslint-disable-next-line @next/next/no-img-element -- a local blob: URL, not an optimizable asset
    return <img src={url} alt="Converted GIF" className="max-h-72 w-auto rounded-2xl bg-black" />;
  }
  if (blob.type.startsWith("audio/")) {
    return <audio src={url} controls className="w-full" />;
  }
  return <video src={url} controls playsInline className="max-h-72 w-full rounded-2xl bg-black" />;
}
