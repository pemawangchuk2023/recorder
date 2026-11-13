// Finds a sheet of paper in a photo, so its corners don't have to be placed
// by hand.
//
// Paper is the large, bright, colourless thing in the picture. The photo is
// given here as one "paper-likeness" value per pixel (bright and neutral
// scores high; dark or strongly coloured, like a wooden table, scores low).
// That is split into "paper" and "not paper" at the level that separates
// them best, and the largest patch of paper is taken to be the page.
//
// The page's corners are then found from its sides, not from its outermost
// points: a straight line is fitted along each of the four sides, ignoring
// stray points (a curled corner, a finger, a bit of glare that leaked out),
// and the corners are where those lines cross. That keeps one bad spot on
// the outline from dragging a corner away.
//
// It gives up when no page stands out, for instance white paper on a white
// table; the corners can always be placed by hand.

interface Point {
  x: number;
  y: number;
}

type Corners = [Point, Point, Point, Point];

// The page must fill at least this share of the photo to be believed…
const MIN_PAGE_SHARE = 0.08;
// …and its outline must be at least this full of paper: a real page is a
// solid shape, not a scatter of highlights.
const MIN_FILL = 0.7;

// How paper-like a colour is, 0–255: its brightness, marked down the more
// colourful it is. White, grey and faintly tinted paper keep their
// brightness; wood, skin, fabric and coloured surfaces fall away.
export function paperLikeness(red: number, green: number, blue: number): number {
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  const colourfulness = max === 0 ? 0 : (max - min) / max;
  // Up to a slight tint costs nothing (paper under coloured light); beyond
  // that the score drops quickly.
  const neutral = Math.max(0, 1 - Math.max(0, colourfulness - 0.12) * 2.6);
  return brightness * neutral;
}

// The level that best separates the low values from the high (Otsu's method).
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

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

interface Line {
  // value = slope × along + offset
  slope: number;
  offset: number;
}

// The straight line through most of the points, ignoring the ones that
// don't fit. Each point is [position along the side, position across it].
export function fitSide(points: [number, number][]): Line | null {
  let kept = points;
  let line: Line | null = null;
  for (let round = 0; round < 5 && kept.length >= 4; round++) {
    let sumT = 0;
    let sumV = 0;
    let sumTT = 0;
    let sumTV = 0;
    for (const [t, v] of kept) {
      sumT += t;
      sumV += v;
      sumTT += t * t;
      sumTV += t * v;
    }
    const n = kept.length;
    const spread = n * sumTT - sumT * sumT;
    if (spread === 0) {
      return null;
    }
    const slope = (n * sumTV - sumT * sumV) / spread;
    const fitted: Line = { slope, offset: (sumV - slope * sumT) / n };
    line = fitted;
    const misses = kept.map(([t, v]) => Math.abs(v - (fitted.slope * t + fitted.offset)));
    const allowed = Math.max(1.2, median(misses) * 2.5);
    const next = kept.filter((_, index) => misses[index] <= allowed);
    if (next.length === kept.length || next.length < points.length * 0.4) {
      break;
    }
    kept = next;
  }
  return line;
}

// Where a side running mostly up-down (x = slope·y + offset) meets one
// running mostly across (y = slope·x + offset).
function crossing(upright: Line, level: Line): Point | null {
  const denominator = 1 - upright.slope * level.slope;
  if (Math.abs(denominator) < 1e-6) {
    return null;
  }
  const x = (upright.slope * level.offset + upright.offset) / denominator;
  return { x, y: level.slope * x + level.offset };
}

// `gray` holds one paper-likeness value (0–255) per pixel, row by row (plain
// brightness works too, for a page on a dark surface). A small version of
// the photo, a few hundred pixels across, is enough and fast. Returns the
// corners clockwise from the top left as fractions of the photo, or null
// when no page stands out.
export function detectPage(gray: Uint8Array | Uint8ClampedArray, width: number, height: number): Corners | null {
  if (width < 8 || height < 8) {
    return null;
  }
  const level = splitLevel(gray);
  const total = width * height;
  // 0 = not paper, -1 = paper not yet visited, otherwise the patch number.
  const patch = new Int32Array(total);
  let paperTotal = 0;
  for (let index = 0; index < total; index++) {
    if (gray[index] > level) {
      patch[index] = -1;
      paperTotal++;
    }
  }
  // Everything paper (a page filling the photo) or nothing: no edges to find.
  if (paperTotal > total * 0.97 || paperTotal < total * MIN_PAGE_SHARE) {
    return null;
  }

  interface Patch {
    id: number;
    size: number;
    left: number;
    right: number;
    top: number;
    bottom: number;
    extremes: Point[];
  }
  let best: Patch | null = null;
  let nextId = 1;
  const queue = new Int32Array(total);
  for (let start = 0; start < total; start++) {
    if (patch[start] !== -1) {
      continue;
    }
    // Flood out from this pixel over all the paper that touches it.
    const id = nextId++;
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    patch[start] = id;
    const startX = start % width;
    const startY = (start - startX) / width;
    const current: Patch = { id, size: 0, left: startX, right: startX, top: startY, bottom: startY, extremes: [] };
    let topLeft = { x: startX, y: startY };
    let topRight = topLeft;
    let bottomRight = topLeft;
    let bottomLeft = topLeft;
    while (head < tail) {
      const index = queue[head++];
      const x = index % width;
      const y = (index - x) / width;
      current.size++;
      current.left = Math.min(current.left, x);
      current.right = Math.max(current.right, x);
      current.top = Math.min(current.top, y);
      current.bottom = Math.max(current.bottom, y);
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
      if (x > 0 && patch[index - 1] === -1) {
        patch[index - 1] = id;
        queue[tail++] = index - 1;
      }
      if (x < width - 1 && patch[index + 1] === -1) {
        patch[index + 1] = id;
        queue[tail++] = index + 1;
      }
      if (y > 0 && patch[index - width] === -1) {
        patch[index - width] = id;
        queue[tail++] = index - width;
      }
      if (y < height - 1 && patch[index + width] === -1) {
        patch[index + width] = id;
        queue[tail++] = index + width;
      }
    }
    current.extremes = [topLeft, topRight, bottomRight, bottomLeft];
    if (!best || current.size > best.size) {
      best = current;
    }
  }

  if (!best || best.size < total * MIN_PAGE_SHARE) {
    return null;
  }
  const page = best;

  const believable = (corners: Point[]): boolean => {
    const area = quadArea(corners);
    const fill = page.size / area;
    return area >= total * MIN_PAGE_SHARE && fill >= MIN_FILL && fill <= 1.3;
  };

  // The page's sides: for each row, where the paper starts and ends; for
  // each column, likewise. The ends of each side are left out, since
  // that's where corners curl and neighbouring sides interfere.
  const spanX = page.right - page.left;
  const spanY = page.bottom - page.top;
  const leftSide: [number, number][] = [];
  const rightSide: [number, number][] = [];
  const topSide: [number, number][] = [];
  const bottomSide: [number, number][] = [];
  for (let y = Math.ceil(page.top + spanY * 0.12); y <= page.bottom - spanY * 0.12; y++) {
    let first = -1;
    let last = -1;
    for (let x = page.left; x <= page.right; x++) {
      if (patch[y * width + x] === page.id) {
        if (first === -1) {
          first = x;
        }
        last = x;
      }
    }
    if (first !== -1) {
      leftSide.push([y, first]);
      rightSide.push([y, last]);
    }
  }
  for (let x = Math.ceil(page.left + spanX * 0.12); x <= page.right - spanX * 0.12; x++) {
    let first = -1;
    let last = -1;
    for (let y = page.top; y <= page.bottom; y++) {
      if (patch[y * width + x] === page.id) {
        if (first === -1) {
          first = y;
        }
        last = y;
      }
    }
    if (first !== -1) {
      topSide.push([x, first]);
      bottomSide.push([x, last]);
    }
  }

  let corners: Point[] | null = null;
  const left = fitSide(leftSide);
  const right = fitSide(rightSide);
  const top = fitSide(topSide);
  const bottom = fitSide(bottomSide);
  if (left && right && top && bottom) {
    const crossed = [crossing(left, top), crossing(right, top), crossing(right, bottom), crossing(left, bottom)];
    if (crossed.every((point): point is Point => point !== null)) {
      // A side that touches the photo's edge puts its corners on that edge.
      const fitted = crossed.map((point) => ({
        x: Math.min(width - 1, Math.max(0, point.x)),
        y: Math.min(height - 1, Math.max(0, point.y)),
      }));
      if (believable(fitted)) {
        corners = fitted;
      }
    }
  }
  // Failing that (a very odd shape), the page's outermost points.
  if (!corners && believable(page.extremes)) {
    corners = page.extremes;
  }
  if (!corners) {
    return null;
  }
  const toFraction = (point: Point): Point => ({
    x: Math.min(1, Math.max(0, point.x / (width - 1))),
    y: Math.min(1, Math.max(0, point.y / (height - 1))),
  });
  return [toFraction(corners[0]), toFraction(corners[1]), toFraction(corners[2]), toFraction(corners[3])];
}
