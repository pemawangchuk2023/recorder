// Finds a sheet of paper in a photo, so its corners don't have to be placed
// by hand. The idea is simple: paper is usually the big bright thing in the
// picture. The photo is split into "bright" and "dark" at the level that
// separates them best, the largest bright patch is taken to be the page, and
// its four extreme points are its corners.
//
// It works well for a page on a darker, fairly plain surface. On a white
// desk, or with strong shadows across the page, it gives up and the whole
// photo is used; the corners can always be moved by hand.

interface Point {
  x: number;
  y: number;
}

type Corners = [Point, Point, Point, Point];

// The page must fill at least this share of the photo to be believed…
const MIN_PAGE_SHARE = 0.08;
// …and its outline must be at least this full of bright pixels: a real page
// is a solid shape, not a scatter of highlights.
const MIN_FILL = 0.7;

// The brightness level that best separates dark from bright (Otsu's method).
export function splitLevel(gray: Uint8Array | Uint8ClampedArray): number {
  const histogram = new Array<number>(256).fill(0);
  for (let index = 0; index < gray.length; index++) {
    histogram[gray[index]]++;
  }
  let total = 0;
  for (let level = 0; level < 256; level++) {
    total += level * histogram[level];
  }
  let darkCount = 0;
  let darkSum = 0;
  let best = 127;
  let bestSpread = -1;
  for (let level = 0; level < 256; level++) {
    darkCount += histogram[level];
    if (darkCount === 0) {
      continue;
    }
    const brightCount = gray.length - darkCount;
    if (brightCount === 0) {
      break;
    }
    darkSum += level * histogram[level];
    const gap = darkSum / darkCount - (total - darkSum) / brightCount;
    const spread = darkCount * brightCount * gap * gap;
    if (spread > bestSpread) {
      bestSpread = spread;
      best = level;
    }
  }
  return best;
}

function quadArea(corners: Point[]): number {
  let area = 0;
  for (let index = 0; index < corners.length; index++) {
    const a = corners[index];
    const b = corners[(index + 1) % corners.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

// `gray` holds one brightness value (0–255) per pixel, row by row. A small
// version of the photo (a few hundred pixels across) is enough and fast.
// Returns the corners clockwise from the top left as fractions of the
// photo, or null when no page stands out.
export function detectPage(gray: Uint8Array | Uint8ClampedArray, width: number, height: number): Corners | null {
  if (width < 8 || height < 8) {
    return null;
  }
  const level = splitLevel(gray);
  const total = width * height;
  // 0 = dark, 1 = bright and not yet visited, 2 = visited.
  const marks = new Uint8Array(total);
  let brightTotal = 0;
  for (let index = 0; index < total; index++) {
    if (gray[index] > level) {
      marks[index] = 1;
      brightTotal++;
    }
  }
  // Everything bright (a page filling the photo) or nothing: no edges to find.
  if (brightTotal > total * 0.97 || brightTotal < total * MIN_PAGE_SHARE) {
    return null;
  }

  let best: { size: number; corners: Point[] } | null = null;
  const queue = new Int32Array(total);
  for (let start = 0; start < total; start++) {
    if (marks[start] !== 1) {
      continue;
    }
    // Flood out from this pixel over everything bright that touches it,
    // remembering the points furthest towards each corner of the photo.
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    marks[start] = 2;
    let size = 0;
    const startX = start % width;
    const startY = (start - startX) / width;
    const first = { x: startX, y: startY };
    let topLeft = first;
    let topRight = first;
    let bottomRight = first;
    let bottomLeft = first;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = (index - x) / width;
      size++;
      if (x + y < topLeft.x + topLeft.y) {
        topLeft = { x, y };
      }
      if (x + y > bottomRight.x + bottomRight.y) {
        bottomRight = { x, y };
      }
      if (x - y > topRight.x - topRight.y) {
        topRight = { x, y };
      }
      if (x - y < bottomLeft.x - bottomLeft.y) {
        bottomLeft = { x, y };
      }
      if (x > 0 && marks[index - 1] === 1) {
        marks[index - 1] = 2;
        queue[tail++] = index - 1;
      }
      if (x < width - 1 && marks[index + 1] === 1) {
        marks[index + 1] = 2;
        queue[tail++] = index + 1;
      }
      if (y > 0 && marks[index - width] === 1) {
        marks[index - width] = 2;
        queue[tail++] = index - width;
      }
      if (y < height - 1 && marks[index + width] === 1) {
        marks[index + width] = 2;
        queue[tail++] = index + width;
      }
    }
    if (!best || size > best.size) {
      best = { size, corners: [topLeft, topRight, bottomRight, bottomLeft] };
    }
  }

  if (!best || best.size < total * MIN_PAGE_SHARE) {
    return null;
  }
  const area = quadArea(best.corners);
  if (area < total * MIN_PAGE_SHARE || best.size / area < MIN_FILL || best.size / area > 1.25) {
    return null;
  }
  const toFraction = (point: Point): Point => ({
    x: Math.min(1, Math.max(0, point.x / (width - 1))),
    y: Math.min(1, Math.max(0, point.y / (height - 1))),
  });
  return [
    toFraction(best.corners[0]),
    toFraction(best.corners[1]),
    toFraction(best.corners[2]),
    toFraction(best.corners[3]),
  ];
}
