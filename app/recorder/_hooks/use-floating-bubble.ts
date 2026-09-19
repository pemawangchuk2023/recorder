import { useCallback, useEffect, useState } from "react";

const BUBBLE_SIZE = 240;

// The window is a separate document, so it gets its own small stylesheet.
// Chrome always draws this window as a rectangle with its own title bar (a
// website can't make it round or transparent), so the camera fills all of it.
const BUBBLE_CSS = `
  html, body { margin: 0; height: 100%; overflow: hidden; background: #18181b;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  .bubble { position: relative; height: 100%; }
  .camera { display: block; width: 100%; height: 100%; object-fit: cover; }
  .message { position: absolute; inset: 0; display: grid; place-items: center; margin: 0;
    padding: 32px; text-align: center; color: #fff; font-size: 14px; }
  .controls { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 12px;
    border-radius: 999px; background: rgba(0, 0, 0, 0.75); color: #fff;
    font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums;
    opacity: 0; transition: opacity 0.15s; }
  .bubble:hover .controls { opacity: 1; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
  .controls button { all: unset; display: grid; place-items: center; width: 28px; height: 28px;
    border-radius: 50%; background: rgba(255, 255, 255, 0.18); cursor: pointer; }
  .controls button:hover { background: rgba(255, 255, 255, 0.32); }
`;

export function isFloatingBubbleSupported(): boolean {
  return "documentPictureInPicture" in window;
}

export interface FloatingBubble {
  pipWindow: Window | null;
  open: () => void;
  close: () => void;
}

// A Document Picture-in-Picture window: always on top of every app, like
// Loom's camera bubble. Must be opened from a click.
export function useFloatingBubble(): FloatingBubble {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  const open = useCallback(() => {
    if (pipWindow || !window.documentPictureInPicture) {
      return;
    }
    window.documentPictureInPicture
      .requestWindow({
        width: BUBBLE_SIZE,
        height: BUBBLE_SIZE,
        disallowReturnToOpener: true,
      })
      .then((next) => {
        next.document.title = "Camera";
        const style = next.document.createElement("style");
        style.textContent = BUBBLE_CSS;
        next.document.head.append(style);
        next.addEventListener("pagehide", () => setPipWindow(null), { once: true });
        setPipWindow(next);
      })
      .catch(() => {
        // Usually a missing click gesture; the "Show floating bubble" button stays available.
      });
  }, [pipWindow]);

  const close = useCallback(() => pipWindow?.close(), [pipWindow]);

  useEffect(() => () => pipWindow?.close(), [pipWindow]);

  return { pipWindow, open, close };
}
