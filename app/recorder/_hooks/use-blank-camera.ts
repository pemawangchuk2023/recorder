import { useEffect, useState } from "react";
import { isBlankFrame } from "@/app/recorder/_lib/camera-capture";

const SAMPLE_WIDTH = 32;
const SAMPLE_HEIGHT = 18;
const SAMPLE_MS = 1000;
// Consecutive blank samples before warning, so a camera still warming up
// (its first frames are often black) isn't flagged.
const BLANK_SAMPLES = 3;

// Whether a live camera keeps delivering an all-black picture — its privacy
// shutter is closed or it's switched off by a keyboard key.
export function useBlankCamera(stream: MediaStream | null): boolean {
  const [blank, setBlank] = useState(false);

  useEffect(() => {
    if (!stream) return;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.play().catch(() => {});
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let streak = 0;

    const timer = setInterval(() => {
      if (!context || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      streak = isBlankFrame(data) ? streak + 1 : 0;
      setBlank(streak >= BLANK_SAMPLES);
    }, SAMPLE_MS);

    return () => {
      clearInterval(timer);
      video.srcObject = null;
      setBlank(false);
    };
  }, [stream]);

  return stream ? blank : false;
}
