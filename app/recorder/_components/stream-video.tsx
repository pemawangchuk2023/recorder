"use client";

import { useEffect, useRef, type CSSProperties } from "react";

// A muted <video> showing a live MediaStream.
export function StreamVideo({
  stream,
  className,
  style,
}: {
  stream: MediaStream | null;
  className?: string;
  style?: CSSProperties;
}) {
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

  return <video ref={videoRef} muted playsInline className={className} style={style} />;
}
