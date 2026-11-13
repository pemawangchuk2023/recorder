"use client";

import { ImageIcon } from "lucide-react";
import { useState, type RefObject } from "react";
import { setRecordingThumbnail } from "@/lib/library/library";

const THUMBNAIL_WIDTH = 640;

// The frame showing in the player, as a small JPEG.
function frameAsThumbnail(video: HTMLVideoElement): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) {
    return Promise.resolve(null);
  }
  const scale = Math.min(1, THUMBNAIL_WIDTH / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return Promise.resolve(null);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

// Makes the frame showing in the player the recording's thumbnail in the library.
export function ThumbnailButton({
  recordingId,
  playbackRef,
}: {
  recordingId: string;
  playbackRef: RefObject<HTMLVideoElement | null>;
}) {
  const [message, setMessage] = useState<string | null>(null);

  const choose = async () => {
    const video = playbackRef.current;
    const thumbnail = video ? await frameAsThumbnail(video) : null;
    if (!thumbnail) {
      setMessage("Play the video first, then try again.");
      return;
    }
    try {
      await setRecordingThumbnail(recordingId, thumbnail);
      setMessage("This frame is now the thumbnail.");
    } catch {
      setMessage("The thumbnail couldn't be saved.");
    }
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void choose()}
        title="Pause on the frame you want, then press this"
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-border transition-colors hover:bg-muted"
      >
        <ImageIcon className="size-4" aria-hidden="true" />
        Use this frame as thumbnail
      </button>
      {message && (
        <span role="status" className="text-sm text-muted-foreground">
          {message}
        </span>
      )}
    </span>
  );
}
