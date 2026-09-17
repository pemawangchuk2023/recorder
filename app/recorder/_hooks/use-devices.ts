import { useCallback, useEffect, useState } from "react";

export interface MediaDevice {
  deviceId: string;
  label: string;
}

export interface Devices {
  microphones: MediaDevice[];
  cameras: MediaDevice[];
  labelsAvailable: boolean;
  refresh: () => Promise<void>;
  requestMicPermission: () => Promise<void>;
}

function listDevices(
  devices: MediaDeviceInfo[],
  kind: MediaDeviceKind,
  fallbackLabel: string
): MediaDevice[] {
  return devices
    .filter((device) => device.kind === kind && device.deviceId !== "")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label || `${fallbackLabel} ${index + 1}`,
    }));
}

export function useDevices(): Devices {
  const [microphones, setMicrophones] = useState<MediaDevice[]>([]);
  const [cameras, setCameras] = useState<MediaDevice[]>([]);
  const [labelsAvailable, setLabelsAvailable] = useState(false);

  const refresh = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    setMicrophones(listDevices(devices, "audioinput", "Microphone"));
    setCameras(listDevices(devices, "videoinput", "Camera"));
    setLabelsAvailable(devices.some((device) => device.label !== ""));
  }, []);

  useEffect(() => {
    // Fetching from an external system (navigator.mediaDevices) on mount,
    // and subscribing to its devicechange event below — both sanctioned
    // effect use cases per https://react.dev/learn/you-might-not-need-an-effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) {
      return;
    }
    mediaDevices.addEventListener("devicechange", refresh);
    return () => mediaDevices.removeEventListener("devicechange", refresh);
  }, [refresh]);

  const requestMicPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      await refresh();
    } catch {
      // Permission denied or no microphone — Start will explain what happened.
    }
  }, [refresh]);

  return { microphones, cameras, labelsAvailable, refresh, requestMicPermission };
}
