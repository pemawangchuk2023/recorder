"use client";

import { useEffect, useRef } from "react";

// A muted <video> showing a live MediaStream.
export function StreamVideo({ stream, className }: { stream: MediaStream | null; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    video.srcObject = stream;
    if (stream) {
      video.play().catch(() => {});
    }
  }, [stream]);

  return <video ref={videoRef} muted playsInline className={className} />;
}
