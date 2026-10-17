import { useEffect, useState } from "react";
import { CAMERA_STOPPED_ERROR, describeDeviceError } from "@/app/recorder/_lib/errors";
import { cameraQualityNotice, openCamera, type CameraTarget } from "@/app/recorder/_lib/camera-capture";

export interface Camera {
  stream: MediaStream | null;
  error: string | null;
  notice: string | null;
}

// Keeps the chosen camera running while it's turned on, so the floating
// bubble and the preview can show it before and between recordings.
export function useCamera(enabled: boolean, deviceId: string | undefined, { width, height, frameRate }: CameraTarget): Camera {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    let acquired: MediaStream | null = null;
    let track: MediaStreamTrack | undefined;

    // An unplugged camera, or one taken over by another app, ends the track
    // without changing any state — re-render so the dead stream is dropped.
    const onEnded = () => {
      if (!cancelled) setError(CAMERA_STOPPED_ERROR);
    };

    const target = { width, height, frameRate };
    openCamera(deviceId, target)
      .then((next) => {
        if (cancelled) {
          next.getTracks().forEach((t) => t.stop());
          return;
        }
        acquired = next;
        track = next.getVideoTracks()[0];
        track?.addEventListener("ended", onEnded);
        setStream(next);
        setError(null);
        setNotice(track ? cameraQualityNotice(track, target) : null);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(describeDeviceError(cause, "camera"));
        }
      });

    return () => {
      cancelled = true;
      track?.removeEventListener("ended", onEnded);
      acquired?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, deviceId, width, height, frameRate]);

  // A stopped stream (camera turned off or switched) is never returned.
  return {
    stream: enabled && stream?.active ? stream : null,
    error: enabled ? error : null,
    notice: enabled && stream?.active ? notice : null,
  };
}
