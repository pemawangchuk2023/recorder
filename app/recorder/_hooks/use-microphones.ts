import { useCallback, useEffect, useState } from "react";

export interface Microphone {
  deviceId: string;
  label: string;
}

export interface UseMicrophonesResult {
  microphones: Microphone[];
  labelsAvailable: boolean;
  refresh: () => Promise<void>;
  requestPermission: () => Promise<void>;
}

export function useMicrophones(): UseMicrophonesResult {
  const [microphones, setMicrophones] = useState<Microphone[]>([]);
  const [labelsAvailable, setLabelsAvailable] = useState(false);

  const refresh = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.enumerateDevices
    ) {
      return;
    }
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter(
      (device) => device.kind === "audioinput"
    );
    setLabelsAvailable(inputs.some((device) => device.label !== ""));
    setMicrophones(
      inputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
      }))
    );
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

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      await refresh();
    } catch {
      // Permission denied or no microphone — the device list simply stays
      // unlabeled; clicking Start will surface a clear error.
    }
  }, [refresh]);

  return { microphones, labelsAvailable, refresh, requestPermission };
}
