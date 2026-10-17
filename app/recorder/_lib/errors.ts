function errorName(cause: unknown): string | null {
  return cause instanceof DOMException ? cause.name : null;
}

export function describeScreenCaptureError(cause: unknown): string {
  switch (errorName(cause)) {
    case "NotAllowedError":
    case "SecurityError":
    case "AbortError":
      return "Screen sharing wasn't started — you may have cancelled the picker or denied permission. Click Start to try again.";
    case "NotFoundError":
      return "No shareable screen, window, or tab was found.";
    case "NotReadableError":
      return "Your screen couldn't be captured. On macOS, allow your browser in System Settings → Privacy & Security → Screen Recording.";
    default:
      return "Something went wrong while starting capture. Please try again.";
  }
}

export function describeDeviceError(
  cause: unknown,
  device: "microphone" | "camera"
): string {
  const without =
    device === "microphone"
      ? "recording without your voice"
      : "recording without the webcam bubble";
  const name = device === "microphone" ? "Microphone" : "Camera";

  switch (errorName(cause)) {
    case "NotAllowedError":
    case "SecurityError":
      return `${name} access is blocked — ${without}. Allow it from the icon in the address bar. On Windows, also check Settings → Privacy & security → ${name}, and turn on access for desktop apps. Then record again.`;
    case "NotFoundError":
    case "OverconstrainedError":
      return `No ${device} was found — ${without}.`;
    case "NotReadableError":
      return `Your ${device} couldn't be opened — it may be in use by another app such as Teams or Zoom — ${without}. Close that app, then turn the ${device} off and on again.`;
    default:
      return `Your ${device} couldn't be started — ${without}.`;
  }
}

export const CAMERA_STOPPED_ERROR =
  "Your camera stopped — it may have been unplugged or taken over by another app. Turn the camera off and on again.";

// Recording on without the sound would leave only the microphone hearing the
// speakers — muddy and distorted — so the take is stopped instead.
export const NO_COMPUTER_SOUND_ERROR =
  "Computer sound wasn't shared, so YouTube, music and other sound can't be recorded. Press Start again, choose the “Chrome Tab” list, pick the tab playing the sound, and keep “Also share tab audio” switched on. On a Mac, sharing a window or the entire screen carries no sound. To record without it, turn off “Record computer sound”.";

export const SPEAKER_ECHO_NOTICE =
  "Recording computer sound and your microphone together: wear headphones, or the microphone will also pick up the speakers and make the sound muddy.";

// Shown when the shared computer sound stays completely silent. On a Mac,
// sharing a screen or window gives Chrome a sound track that stays empty
// without the System Audio Recording permission.
export function silentComputerSoundNotice(displaySurface: string | undefined): string {
  const fix =
    "Stop, press Start again, choose the “Chrome Tab” list, pick the tab playing the sound, and keep “Also share tab audio” on.";
  return displaySurface === "browser"
    ? `No computer sound is coming through yet. If the tab is playing, check it isn't muted in Chrome (right-click the tab) — or ${fix.charAt(0).toLowerCase()}${fix.slice(1)}`
    : `No computer sound is coming through: on a Mac, sharing a ${displaySurface === "window" ? "window" : "whole screen"} usually records no sound. ${fix} (Or allow Chrome in System Settings → Privacy & Security → Screen & System Audio Recording.)`;
}
