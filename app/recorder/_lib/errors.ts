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
      return `${name} access is blocked — ${without}. Allow it from the icon in the address bar, then record again.`;
    case "NotFoundError":
    case "OverconstrainedError":
      return `No ${device} was found — ${without}.`;
    case "NotReadableError":
      return `Your ${device} is being used by another app — ${without}.`;
    default:
      return `Your ${device} couldn't be started — ${without}.`;
  }
}
