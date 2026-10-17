export interface CameraTarget {
  width: number;
  height: number;
  frameRate: number;
}

// These camera controls are supported by some browsers/drivers but are not
// included in TypeScript's DOM declarations yet.
type CameraConstraints = MediaTrackConstraints & { resizeMode?: ConstrainDOMString };
type CameraCapabilities = MediaTrackCapabilities & { focusMode?: string[] };

export function cameraConstraints(target: CameraTarget): CameraConstraints {
  return {
    width: { ideal: target.width },
    height: { ideal: target.height },
    frameRate: { ideal: target.frameRate },
    resizeMode: { ideal: "none" },
  };
}

export async function improveCameraCapture(
  track: MediaStreamTrack,
  target: CameraTarget
): Promise<void> {
  const capabilities: CameraCapabilities = track.getCapabilities?.() ?? {};
  const actual = track.getSettings();
  const width = Math.min(target.width, capabilities.width?.max ?? target.width);
  const height = Math.min(target.height, capabilities.height?.max ?? target.height);

  // Ideal constraints can trade resolution for frame rate. If that happened,
  // retry with a resolution floor, retaining a preferred (not mandatory) fps.
  // A failed applyConstraints leaves the already working capture intact.
  if ((actual.width ?? 0) < width || (actual.height ?? 0) < height) {
    try {
      await track.applyConstraints({
        ...cameraConstraints(target),
        width: { min: width, ideal: width },
        height: { min: height, ideal: height },
      });
    } catch {
      // Some drivers expose ranges whose maxima cannot be used together.
    }
  }

  // Restore autofocus on cameras left in manual focus by another app. Never
  // send focus controls to fixed-focus cameras or unsupported drivers.
  if (track.readyState === "live" && capabilities.focusMode?.includes("continuous")) {
    const focus: MediaTrackConstraintSet & { focusMode: string } = {
      focusMode: "continuous",
    };
    try {
      await track.applyConstraints({ ...track.getConstraints(), advanced: [focus] });
    } catch {
      // Optional image controls must not prevent camera access.
    }
  }
}

export function cameraQualityNotice(track: MediaStreamTrack, target: CameraTarget): string | null {
  const { width, height, frameRate } = track.getSettings();
  if (!width || !height) return null;
  const lowerResolution = width < target.width || height < target.height;
  const lowerFrameRate = frameRate !== undefined && frameRate < target.frameRate - 1;
  if (!lowerResolution && !lowerFrameRate) return null;
  const rate = frameRate === undefined ? "" : ` at ${Math.round(frameRate)} fps`;
  return `Camera is delivering ${width} × ${height}${rate}, below the requested ${target.width} × ${target.height} at ${target.frameRate} fps. Recording quality settings cannot add missing camera detail.`;
}

// A plain request that every webcam driver accepts.
const BASIC_CAMERA: MediaTrackConstraints = { width: { ideal: 1280 }, height: { ideal: 720 } };

// Windows releases a camera asynchronously, so reopening it right after it was
// stopped (switching camera or quality) can fail with NotReadableError.
const REOPEN_DELAY_MS = 700;

const RETRYABLE = new Set(["NotReadableError", "AbortError", "OverconstrainedError", "NotFoundError"]);

function errorName(cause: unknown): string | null {
  return cause instanceof DOMException ? cause.name : null;
}

interface OpenOptions {
  media?: Pick<MediaDevices, "getUserMedia">;
  wait?: (ms: number) => Promise<void>;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Opens the camera at the target quality, falling back to a plain request and
// then to the default camera so a picky driver or a busy, still-closing or
// unplugged device doesn't leave the camera blank.
export async function openCamera(
  deviceId: string | undefined,
  target: CameraTarget,
  { media = navigator.mediaDevices, wait = delay }: OpenOptions = {}
): Promise<MediaStream> {
  const request = (video: MediaTrackConstraints, id: string | undefined) =>
    media.getUserMedia({ video: id ? { ...video, deviceId: { exact: id } } : video });

  const openBasic = async (cause: unknown): Promise<MediaStream> => {
    const name = errorName(cause);
    if (!name || !RETRYABLE.has(name)) throw cause;
    if (name === "NotReadableError" || name === "AbortError") await wait(REOPEN_DELAY_MS);
    try {
      return await request(BASIC_CAMERA, deviceId);
    } catch (retryCause) {
      // A remembered camera may have been unplugged — use the default.
      const retryName = errorName(retryCause);
      if (deviceId && (retryName === "NotFoundError" || retryName === "OverconstrainedError")) {
        return request(BASIC_CAMERA, undefined);
      }
      throw retryCause;
    }
  };

  let stream: MediaStream;
  try {
    stream = await request(cameraConstraints(target), deviceId);
  } catch (cause) {
    return openBasic(cause);
  }

  const track = stream.getVideoTracks()[0];
  if (!track) return stream;
  await improveCameraCapture(track, target);
  if (track.readyState === "live") return stream;

  // Renegotiating the resolution can end the track on some Windows drivers.
  stream.getTracks().forEach((t) => t.stop());
  return openBasic(new DOMException("Camera track ended", "AbortError"));
}

// Share of sampled pixels that must be near-black for the picture to count as
// blank. Windows sends a black frame with a small crossed-out camera icon when
// a laptop's privacy shutter or camera key is off, so a few bright pixels
// (the icon) are allowed.
const BLANK_SHARE = 0.97;
const DARK_LUMA = 12;

export function isBlankFrame(rgba: ArrayLike<number>): boolean {
  let dark = 0;
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return false;
  for (let i = 0; i < pixels * 4; i += 4) {
    const luma = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
    if (luma < DARK_LUMA) dark++;
  }
  return dark / pixels >= BLANK_SHARE;
}

export const CAMERA_BLANK_NOTICE =
  "Your camera is sending a black picture. Open the camera's privacy shutter or press the camera key on your keyboard (often F8 or F10), then turn the camera off and on again.";
