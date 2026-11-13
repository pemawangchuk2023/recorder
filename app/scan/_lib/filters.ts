// The looks a scanned page can be given. All of them work on raw pixels
// (red, green, blue, alpha for each pixel) and change them in place.

export type ScanFilter = "original" | "enhance" | "gray" | "bw";

export const SCAN_FILTERS: { value: ScanFilter; label: string; description: string }[] = [
  { value: "enhance", label: "Enhance", description: "Whiter paper and stronger ink, colours kept." },
  { value: "bw", label: "Black & white", description: "Crisp text like a photocopy. Smallest files; not for photos." },
  { value: "gray", label: "Grey", description: "Shades of grey with white paper." },
  { value: "original", label: "Original", description: "The photo as taken, only straightened." },
];

// Fine-tuning on top of a look, each from -100 to 100; 0 changes nothing.
export interface Tone {
  brightness: number;
  contrast: number;
}

export const NEUTRAL_TONE: Tone = { brightness: 0, contrast: 0 };

function luminance(data: Uint8ClampedArray, index: number): number {
  return (data[index] * 299 + data[index + 1] * 587 + data[index + 2] * 114) / 1000;
}

// Stretches brightness so the paper becomes white and the darkest ink black.
// The paper level is taken as what most of the page is at least as bright as.
// `paperShare` below 1 also turns anything nearly as bright as the paper
// white, which wipes out faint grain, creases and camera noise.
export function whitenPaper(data: Uint8ClampedArray, paperShare = 1): void {
  const histogram = new Array<number>(256).fill(0);
  const pixels = data.length / 4;
  for (let index = 0; index < data.length; index += 4) {
    histogram[Math.round(luminance(data, index))]++;
  }
  const levelAt = (share: number): number => {
    let seen = 0;
    for (let level = 0; level < 256; level++) {
      seen += histogram[level];
      if (seen >= pixels * share) {
        return level;
      }
    }
    return 255;
  };
  const black = levelAt(0.02);
  // Paper is the bulk of a page, so the level 60% of pixels are below is
  // already paper; pushing that to white clears shadows and yellowing.
  const white = Math.max(black + 16, levelAt(0.6) * paperShare);
  const scale = 255 / (white - black);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = (data[index] - black) * scale;
    data[index + 1] = (data[index + 1] - black) * scale;
    data[index + 2] = (data[index + 2] - black) * scale;
  }
}

// Evens out the lighting and removes the light's colour: a page lit from
// one side, in shadow, or under a yellowish lamp comes out evenly white.
//
// The page is divided into small squares. In each, the paper's colour is
// taken from its brighter pixels (so writing doesn't drag it down); those
// colours are smoothed across neighbouring squares; then every pixel is
// scaled, one colour channel at a time, by whatever would bring the paper
// around it up to white. Because each channel is scaled separately, a
// colour cast disappears while coloured ink keeps its colour.
export function evenLighting(data: Uint8ClampedArray, width: number, height: number): void {
  const cell = Math.max(8, Math.round(Math.max(width, height) / 48));
  const columns = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const cells = columns * rows;

  // Average brightness of each square.
  const brightness = new Float64Array(cells);
  const counts = new Uint32Array(cells);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / cell) * columns;
    for (let x = 0; x < width; x++) {
      const at = row + Math.floor(x / cell);
      brightness[at] += luminance(data, (y * width + x) * 4);
      counts[at]++;
    }
  }
  for (let at = 0; at < cells; at++) {
    brightness[at] /= Math.max(1, counts[at]);
  }

  // The paper's colour in each square: the average of its brighter pixels.
  const paper = [new Float64Array(cells), new Float64Array(cells), new Float64Array(cells)];
  const paperCounts = new Uint32Array(cells);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / cell) * columns;
    for (let x = 0; x < width; x++) {
      const at = row + Math.floor(x / cell);
      const index = (y * width + x) * 4;
      if (luminance(data, index) >= brightness[at]) {
        paper[0][at] += data[index];
        paper[1][at] += data[index + 1];
        paper[2][at] += data[index + 2];
        paperCounts[at]++;
      }
    }
  }
  for (let at = 0; at < cells; at++) {
    const count = Math.max(1, paperCounts[at]);
    paper[0][at] /= count;
    paper[1][at] /= count;
    paper[2][at] /= count;
  }

  // Smoothed over neighbouring squares, so a heading or a stamp filling one
  // square isn't taken for shadow.
  const reach = 2;
  const smooth = paper.map((channel) => {
    const out = new Float64Array(cells);
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        let total = 0;
        let count = 0;
        for (let dy = -reach; dy <= reach; dy++) {
          const r = row + dy;
          if (r < 0 || r >= rows) {
            continue;
          }
          for (let dx = -reach; dx <= reach; dx++) {
            const c = column + dx;
            if (c >= 0 && c < columns) {
              total += channel[r * columns + c];
              count++;
            }
          }
        }
        out[row * columns + column] = total / count;
      }
    }
    return out;
  });

  for (let y = 0; y < height; y++) {
    // Position between square centres, for a seamless blend from one to the next.
    const gy = Math.min(rows - 1, Math.max(0, (y + 0.5) / cell - 0.5));
    const row0 = Math.floor(gy);
    const row1 = Math.min(rows - 1, row0 + 1);
    const fy = gy - row0;
    for (let x = 0; x < width; x++) {
      const gx = Math.min(columns - 1, Math.max(0, (x + 0.5) / cell - 0.5));
      const column0 = Math.floor(gx);
      const column1 = Math.min(columns - 1, column0 + 1);
      const fx = gx - column0;
      const index = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const grid = smooth[channel];
        const top = grid[row0 * columns + column0] * (1 - fx) + grid[row0 * columns + column1] * fx;
        const bottom = grid[row1 * columns + column0] * (1 - fx) + grid[row1 * columns + column1] * fx;
        const level = top * (1 - fy) + bottom * fy;
        // Never more than quadrupled: a truly dark area is content, not shadow.
        data[index + channel] *= Math.min(4, 250 / Math.max(level, 1));
      }
    }
  }
}

// Darkens everything short of white, so thin or faint writing (pencil,
// a tired printer) stands out. White paper stays white.
export function deepenInk(data: Uint8ClampedArray, strength = 1.45): void {
  const curve = new Uint8ClampedArray(256);
  for (let level = 0; level < 256; level++) {
    curve[level] = 255 * Math.pow(level / 255, strength);
  }
  for (let index = 0; index < data.length; index += 4) {
    data[index] = curve[data[index]];
    data[index + 1] = curve[data[index + 1]];
    data[index + 2] = curve[data[index + 2]];
  }
}

// The brightness and contrast sliders.
export function adjustTone(data: Uint8ClampedArray, tone: Tone): void {
  if (tone.brightness === 0 && tone.contrast === 0) {
    return;
  }
  const shift = tone.brightness * 0.9;
  const factor = tone.contrast >= 0 ? 1 + tone.contrast / 60 : 1 + tone.contrast / 140;
  const curve = new Uint8ClampedArray(256);
  for (let level = 0; level < 256; level++) {
    curve[level] = (level - 128) * factor + 128 + shift;
  }
  for (let index = 0; index < data.length; index += 4) {
    data[index] = curve[data[index]];
    data[index + 1] = curve[data[index + 1]];
    data[index + 2] = curve[data[index + 2]];
  }
}

export function toGray(data: Uint8ClampedArray): void {
  for (let index = 0; index < data.length; index += 4) {
    const level = luminance(data, index);
    data[index] = level;
    data[index + 1] = level;
    data[index + 2] = level;
  }
}

// Pure black ink on pure white paper. Each pixel is compared with the
// average brightness around it rather than with one level for the whole
// page, so a shadow across the page doesn't turn into a black patch.
// `brightness` (-100 to 100) makes the ink thinner or bolder.
export function toBlackAndWhite(data: Uint8ClampedArray, width: number, height: number, brightness = 0): void {
  const gray = new Uint8Array(width * height);
  const histogram = new Uint32Array(256);
  for (let index = 0; index < gray.length; index++) {
    gray[index] = luminance(data, index * 4);
    histogram[gray[index]]++;
  }
  // The paper's brightness: what 60% of the page is no brighter than.
  let paper = 255;
  for (let level = 0, seen = 0; level < 256; level++) {
    seen += histogram[level];
    if (seen >= gray.length * 0.6) {
      paper = level;
      break;
    }
  }
  // Anything far darker than the paper is ink whatever surrounds it. Without
  // this, the middle of a solid shape (a stamp, a thick heading) would be
  // compared only with more of itself and come out white.
  const solidInk = paper * 0.45;
  // Brightness totals above and to the left of every pixel, which make the
  // average of any rectangle four look-ups. (Whole numbers, to keep a
  // phone's memory use down on a full-size page.)
  const stride = width + 1;
  const sums = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += gray[y * width + x];
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
    }
  }
  const reach = Math.max(4, Math.round(Math.max(width, height) / 32));
  // Ink must be this much darker than its surroundings to count; a darker
  // setting lets fainter marks through.
  const margin = Math.min(0.97, Math.max(0.74, 0.88 - brightness * 0.0011));
  for (let y = 0; y < height; y++) {
    const top = Math.max(0, y - reach);
    const bottom = Math.min(height, y + reach + 1);
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - reach);
      const right = Math.min(width, x + reach + 1);
      const total =
        sums[bottom * stride + right] - sums[top * stride + right] - sums[bottom * stride + left] + sums[top * stride + left];
      const count = (bottom - top) * (right - left);
      const value = gray[y * width + x];
      const level = value < solidInk || value * count < total * margin ? 0 : 255;
      const index = (y * width + x) * 4;
      data[index] = level;
      data[index + 1] = level;
      data[index + 2] = level;
    }
  }
}

export function applyFilter(
  filter: ScanFilter,
  data: Uint8ClampedArray,
  width: number,
  height: number,
  tone: Tone = NEUTRAL_TONE
): void {
  if (filter === "bw") {
    // Two levels only: brightness decides how much counts as ink, and
    // contrast has nothing left to change.
    toBlackAndWhite(data, width, height, tone.brightness);
    return;
  }
  if (filter === "gray") {
    toGray(data);
  }
  if (filter !== "original") {
    evenLighting(data, width, height);
    whitenPaper(data, 0.9);
    deepenInk(data);
  }
  adjustTone(data, tone);
}
