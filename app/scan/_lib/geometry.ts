// Straightening a photographed page. A sheet of paper shot at an angle shows
// up as a slanted four-sided shape; mapping that shape back onto a rectangle
// gives the flat page a scanner would have produced.

export interface Point {
  x: number;
  y: number;
}

// The page's corners in the photo, clockwise from the top left, as fractions
// (0–1) of the photo's width and height.
export type Corners = [Point, Point, Point, Point];

export const FULL_FRAME: Corners = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

// Scans larger than this on their long side gain nothing but file size.
export const MAX_OUTPUT_SIDE = 2400;

export function isFullFrame(corners: Corners): boolean {
  return corners.every((corner, index) => corner.x === FULL_FRAME[index].x && corner.y === FULL_FRAME[index].y);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Twice the signed area of the corner shape; positive when clockwise on screen.
function signedArea(points: Point[]): number {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area;
}

// True when the four corners make a proper page outline: not crossed over,
// not folded in on itself.
export function isConvex(corners: Corners): boolean {
  let sign = 0;
  for (let index = 0; index < 4; index++) {
    const a = corners[index];
    const b = corners[(index + 1) % 4];
    const c = corners[(index + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) {
      return false;
    }
    if (sign === 0) {
      sign = Math.sign(cross);
    } else if (Math.sign(cross) !== sign) {
      return false;
    }
  }
  return signedArea(corners) > 0;
}

// How big the straightened page should be, in pixels: as large as the
// longest opposite edges in the photo, so no detail is thrown away or made up.
export function outputSize(
  corners: Corners,
  photoWidth: number,
  photoHeight: number,
  maxSide = MAX_OUTPUT_SIDE
): { width: number; height: number } {
  const pixels = corners.map((corner) => ({ x: corner.x * photoWidth, y: corner.y * photoHeight }));
  const width = Math.max(distance(pixels[0], pixels[1]), distance(pixels[3], pixels[2]));
  const height = Math.max(distance(pixels[0], pixels[3]), distance(pixels[1], pixels[2]));
  const scale = Math.min(1, maxSide / Math.max(width, height, 1));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

// For a point (u, v) on the flat page (each 0–1), where it lies in the
// photo. Built once per page, then called for every pixel.
export function pageToPhoto(corners: Point[]): (u: number, v: number) => Point {
  const [p0, p1, p2, p3] = corners;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x;
  const sy = p0.y - p1.y + p2.y - p3.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  // g and h are what make far edges shrink, as they do in a photo.
  const g = denominator === 0 ? 0 : (sx * dy2 - dx2 * sy) / denominator;
  const h = denominator === 0 ? 0 : (dx1 * sy - sx * dy1) / denominator;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  return (u, v) => {
    const w = g * u + h * v + 1;
    return { x: (a * u + b * v + p0.x) / w, y: (d * u + e * v + p0.y) / w };
  };
}

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

// Cuts the page out of the photo and flattens it. Each output pixel is
// blended from the four photo pixels around where it came from.
export function straighten(photo: Pixels, corners: Corners, maxSide = MAX_OUTPUT_SIDE): Pixels {
  const { width, height } = outputSize(corners, photo.width, photo.height, maxSide);
  const map = pageToPhoto(
    corners.map((corner) => ({ x: corner.x * (photo.width - 1), y: corner.y * (photo.height - 1) }))
  );
  const out = new Uint8ClampedArray(width * height * 4);
  const source = photo.data;
  const maxX = photo.width - 1;
  const maxY = photo.height - 1;
  for (let y = 0; y < height; y++) {
    const v = height === 1 ? 0 : y / (height - 1);
    for (let x = 0; x < width; x++) {
      const u = width === 1 ? 0 : x / (width - 1);
      const point = map(u, v);
      const px = Math.min(maxX, Math.max(0, point.x));
      const py = Math.min(maxY, Math.max(0, point.y));
      const x0 = Math.floor(px);
      const y0 = Math.floor(py);
      const x1 = Math.min(maxX, x0 + 1);
      const y1 = Math.min(maxY, y0 + 1);
      const fx = px - x0;
      const fy = py - y0;
      const i00 = (y0 * photo.width + x0) * 4;
      const i10 = (y0 * photo.width + x1) * 4;
      const i01 = (y1 * photo.width + x0) * 4;
      const i11 = (y1 * photo.width + x1) * 4;
      const o = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const top = source[i00 + channel] * (1 - fx) + source[i10 + channel] * fx;
        const bottom = source[i01 + channel] * (1 - fx) + source[i11 + channel] * fx;
        out[o + channel] = top * (1 - fy) + bottom * fy;
      }
      out[o + 3] = 255;
    }
  }
  return { data: out, width, height };
}

// Turns the page a quarter turn clockwise, `turns` times.
export function rotate(pixels: Pixels, turns: number): Pixels {
  const quarter = ((turns % 4) + 4) % 4;
  if (quarter === 0) {
    return pixels;
  }
  const { data, width, height } = pixels;
  const swaps = quarter % 2 === 1;
  const outWidth = swaps ? height : width;
  const outHeight = swaps ? width : height;
  const out = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let nx = x;
      let ny = y;
      if (quarter === 1) {
        nx = height - 1 - y;
        ny = x;
      } else if (quarter === 2) {
        nx = width - 1 - x;
        ny = height - 1 - y;
      } else {
        nx = y;
        ny = width - 1 - x;
      }
      const from = (y * width + x) * 4;
      const to = (ny * outWidth + nx) * 4;
      out[to] = data[from];
      out[to + 1] = data[from + 1];
      out[to + 2] = data[from + 2];
      out[to + 3] = data[from + 3];
    }
  }
  return { data: out, width: outWidth, height: outHeight };
}
