import type { RecorderSettings, RecordingMode } from "@/app/recorder/_lib/types";

// The recording mode is not stored on its own: it's the source plus whether
// the camera is on, so the two can never disagree.
export function modeOf(settings: RecorderSettings): RecordingMode {
  if (settings.source === "camera") {
    return "camera";
  }
  return settings.camera.enabled ? "screen-camera" : "screen";
}

export function withMode(settings: RecorderSettings, mode: RecordingMode): RecorderSettings {
  return {
    ...settings,
    source: mode === "camera" ? "camera" : "screen",
    camera: { ...settings.camera, enabled: mode !== "screen" },
  };
}
