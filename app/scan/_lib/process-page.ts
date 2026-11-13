import { detectPage } from "@/app/scan/_lib/detect-edges";
import { applyFilter, type ScanFilter } from "@/app/scan/_lib/filters";
import { FULL_FRAME, MAX_OUTPUT_SIDE, isConvex, rotate, straighten, type Corners, type Pixels } from "@/app/scan/_lib/geometry";

// Photos are kept no larger than this on their long side: enough for small
// print at A4, without a phone's 50-megapixel photo filling the storage.
const MAX_PHOTO_SIDE = 3000;
// Edge-finding looks at a small copy of the photo.
const DETECT_SIDE = 320;
const THUMBNAIL_SIDE = 480;
// Found corners are kept at this share of their distance from the centre.
const EDGE_INSET = 0.985;
const JPEG_QUALITY = 0.86;

export interface PageSettings {
  corners: Corners;
  filter: ScanFilter;
  // Quarter turns clockwise.
  turns: number;
}

export const NOT_A_PICTURE =
  "This file isn't a picture the browser can open. Use a JPG, PNG or WebP photo (iPhone HEIC photos need converting first).";

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;

function createCanvas(width: number, height: number): AnyCanvas {
  if (typeof OffscreenCanvas === "function") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context(canvas: AnyCanvas): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) {
    throw new Error("This browser can't process pictures.");
  }
  return ctx;
}

async function toJpeg(canvas: AnyCanvas, quality = JPEG_QUALITY): Promise<Blob> {
  if (canvas instanceof HTMLCanvasElement) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) {
      throw new Error("The picture couldn't be saved.");
    }
    return blob;
  }
  return canvas.convertToBlob({ type: "image/jpeg", quality });
}

// Draws a picture file onto a canvas no larger than `maxSide`, the right
// way up (phones store the rotation separately from the pixels).
async function drawPhoto(photo: Blob, maxSide: number): Promise<AnyCanvas> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  } catch {
    throw new Error(NOT_A_PICTURE);
  }
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = createCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    const ctx = context(canvas);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}

function pixelsOf(canvas: AnyCanvas): Pixels {
  const image = context(canvas).getImageData(0, 0, canvas.width, canvas.height);
  return { data: image.data, width: image.width, height: image.height };
}

function canvasOf(pixels: Pixels): AnyCanvas {
  const canvas = createCanvas(pixels.width, pixels.height);
  const image = new ImageData(pixels.data as Uint8ClampedArray<ArrayBuffer>, pixels.width, pixels.height);
  context(canvas).putImageData(image, 0, 0);
  return canvas;
}

// A photo as it will be stored: a JPEG of sensible size, upright.
export async function preparePhoto(file: Blob): Promise<Blob> {
  return toJpeg(await drawPhoto(file, MAX_PHOTO_SIDE), 0.92);
}

// Where the page is in the photo; the whole photo when no page stands out.
export async function findCorners(photo: Blob): Promise<{ corners: Corners; found: boolean }> {
  const { data, width, height } = pixelsOf(await drawPhoto(photo, DETECT_SIDE));
  const gray = new Uint8Array(width * height);
  for (let index = 0; index < gray.length; index++) {
    gray[index] = (data[index * 4] * 299 + data[index * 4 + 1] * 587 + data[index * 4 + 2] * 114) / 1000;
  }
  const detected = detectPage(gray, width, height);
  if (!detected || !isConvex(detected)) {
    return { corners: FULL_FRAME, found: false };
  }
  // Pulled a hair towards the middle, so no sliver of desk is left along an edge.
  const centre = {
    x: detected.reduce((sum, corner) => sum + corner.x, 0) / 4,
    y: detected.reduce((sum, corner) => sum + corner.y, 0) / 4,
  };
  const corners = detected.map((corner) => ({
    x: centre.x + (corner.x - centre.x) * EDGE_INSET,
    y: centre.y + (corner.y - centre.y) * EDGE_INSET,
  })) as Corners;
  return { corners, found: true };
}

// The finished page: cut out, flattened, turned and cleaned up.
export async function renderPage(
  photo: Blob,
  settings: PageSettings,
  maxSide = MAX_OUTPUT_SIDE
): Promise<{ image: Blob; width: number; height: number }> {
  // For a small preview there's no need to read the photo at full size.
  const source = pixelsOf(await drawPhoto(photo, Math.min(MAX_PHOTO_SIDE, maxSide * 1.5)));
  const corners = isConvex(settings.corners) ? settings.corners : FULL_FRAME;
  const page = rotate(straighten(source, corners, maxSide), settings.turns);
  applyFilter(settings.filter, page.data, page.width, page.height);
  // Black-and-white pages are all hard edges, which JPEG handles badly at
  // normal quality; a higher setting keeps text clean.
  const image = await toJpeg(canvasOf(page), settings.filter === "bw" ? 0.92 : JPEG_QUALITY);
  return { image, width: page.width, height: page.height };
}

export async function makeThumbnail(page: Blob): Promise<Blob> {
  return toJpeg(await drawPhoto(page, THUMBNAIL_SIDE), 0.8);
}
