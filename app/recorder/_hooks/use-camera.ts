import { useEffect, useState } from "react";
import { describeDeviceError } from "@/app/recorder/_lib/errors";

export interface Camera {
  stream: MediaStream | null;
  error: string | null;
}

// Keeps the chosen camera running while it's turned on, so the floating
// bubble and the preview can show it before and between recordings.
export function useCamera(enabled: boolean, deviceId: string | undefined): Camera {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let acquired: MediaStream | null = null;

    const video: MediaTrackConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      frameRate: { ideal: 30 },
    };
    navigator.mediaDevices
      .getUserMedia({ video: deviceId ? { ...video, deviceId: { exact: deviceId } } : video })
      .catch((cause: unknown) => {
        // A remembered camera may have been unplugged — use the default.
        if (
          deviceId &&
          cause instanceof DOMException &&
          (cause.name === "OverconstrainedError" || cause.name === "NotFoundError")
        ) {
          return navigator.mediaDevices.getUserMedia({ video });
        }
        throw cause;
      })
      .then((next) => {
        if (cancelled) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        acquired = next;
        setStream(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(describeDeviceError(cause, "camera"));
        }
      });

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((track) => track.stop());
    };
  }, [enabled, deviceId]);

  // A stopped stream (camera turned off or switched) is never returned.
  return {
    stream: enabled && stream?.active ? stream : null,
    error: enabled ? error : null,
  };
}
