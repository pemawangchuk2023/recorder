import type { RecorderSettings, RecordingMode } from "@/app/recorder/_lib/types";

// The recording mode is not stored on its own: it's the source plus whether
// the camera is on, so the two can never disagree.
export function modeOf(settings: RecorderSettings): RecordingMode {
  if (settings.source === "camera") {
    return "camera";
  }
  if (settings.camera.enabled) {
    return "screen-camera";
  }
  return settings.verticalScreen ? "tiktok-screen" : "screen";
}

export function withMode(settings: RecorderSettings, mode: RecordingMode): RecorderSettings {
  return {
    ...settings,
    source: mode === "camera" ? "camera" : "screen",
    verticalScreen: mode === "tiktok-screen",
    camera: { ...settings.camera, enabled: mode === "screen-camera" || mode === "camera" },
  };
}
