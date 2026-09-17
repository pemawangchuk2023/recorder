"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { formatTime } from "@/app/recorder/_lib/format-time";
import type { RecorderStatus } from "@/app/recorder/_lib/types";

interface FloatingBubbleProps {
  pipWindow: Window;
  stream: MediaStream | null;
  error: string | null;
  status: RecorderStatus;
  elapsedSeconds: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function FloatingBubble({
  pipWindow,
  stream,
  error,
  status,
  elapsedSeconds,
  onPause,
  onResume,
  onStop,
}: FloatingBubbleProps) {
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

  const isActive = status === "recording" || status === "paused";

  return createPortal(
    <div className="bubble">
      <video ref={videoRef} className="camera" muted playsInline />
      {!stream && <p className="message">{error ?? "Starting camera…"}</p>}
      {isActive && (
        <div className="controls">
          <span className="dot" />
          {formatTime(elapsedSeconds)}
          <button
            type="button"
            aria-label={status === "paused" ? "Resume" : "Pause"}
            onClick={status === "paused" ? onResume : onPause}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#fff" aria-hidden="true">
              {status === "paused" ? (
                <path d="M3 1.5v9l7.5-4.5z" />
              ) : (
                <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />
              )}
            </svg>
          </button>
          <button type="button" aria-label="Stop" onClick={onStop}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#ef4444" aria-hidden="true">
              <rect x="2" y="2" width="8" height="8" rx="1.5" />
            </svg>
          </button>
        </div>
      )}
    </div>,
    pipWindow.document.body
  );
}
