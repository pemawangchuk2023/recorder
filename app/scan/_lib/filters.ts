// The looks a scanned page can be given. All of them work on raw pixels
// (red, green, blue, alpha for each pixel) and change them in place.

export type ScanFilter = "original" | "enhance" | "gray" | "bw";

export const SCAN_FILTERS: { value: ScanFilter; label: string; description: string }[] = [
  { value: "enhance", label: "Enhance", description: "Whiter paper and stronger ink, colours kept." },
  { value: "bw", label: "Black & white", description: "Crisp text like a photocopy. Smallest files; not for photos." },
  { value: "gray", label: "Grey", description: "Shades of grey with white paper." },
  { value: "original", label: "Original", description: "The photo as taken, only straightened." },
];

function luminance(data: Uint8ClampedArray, index: number): number {
  return (data[index] * 299 + data[index + 1] * 587 + data[index + 2] * 114) / 1000;
}

// Stretches brightness so the paper becomes white and the darkest ink black.
// The paper level is taken as what most of the page is at least as bright as.
export function whitenPaper(data: Uint8ClampedArray): void {
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
  const white = Math.max(black + 16, levelAt(0.6));
  const scale = 255 / (white - black);
  for (let index = 0; index < data.length; index += 4) {
    data[index] = (data[index] - black) * scale;
    data[index + 1] = (data[index + 1] - black) * scale;
    data[index + 2] = (data[index + 2] - black) * scale;
  }
}

// Brightness totals above and to the left of every pixel, which make the
// average of any rectangle four look-ups.
function brightnessSums(data: Uint8ClampedArray, width: number, height: number): Float64Array {
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += luminance(data, (y * width + x) * 4);
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
    }
  }
  return sums;
}

// Evens out the lighting: a page lit from one side, or with a soft shadow
// across it, is brought to the same brightness everywhere. Each pixel is
// brightened by however much its neighbourhood falls short of white.
export function evenLighting(data: Uint8ClampedArray, width: number, height: number): void {
  const stride = width + 1;
  const sums = brightnessSums(data, width, height);
  // A wide neighbourhood, so a heading or a stamp doesn't count as shadow.
  const reach = Math.max(8, Math.round(Math.max(width, height) / 10));
  for (let y = 0; y < height; y++) {
    const top = Math.max(0, y - reach);
    const bottom = Math.min(height, y + reach + 1);
    for (let x = 0; x < width; x++) {
      const left = Math.max(0, x - reach);
      const right = Math.min(width, x + reach + 1);
      const total =
        sums[bottom * stride + right] - sums[top * stride + right] - sums[bottom * stride + left] + sums[top * stride + left];
      const average = total / ((bottom - top) * (right - left));
      // Never more than tripled: a truly dark area is content, not shadow.
      const gain = Math.min(3, 248 / Math.max(average, 1));
      if (gain > 1) {
        const index = (y * width + x) * 4;
        data[index] *= gain;
        data[index + 1] *= gain;
        data[index + 2] *= gain;
      }
    }
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
export function toBlackAndWhite(data: Uint8ClampedArray, width: number, height: number): void {
  const gray = new Float64Array(width * height);
  const sorted = new Float64Array(width * height);
  for (let index = 0; index < gray.length; index++) {
    gray[index] = luminance(data, index * 4);
    sorted[index] = gray[index];
  }
  sorted.sort();
  // Anything far darker than the paper is ink whatever surrounds it. Without
  // this, the middle of a solid shape (a stamp, a thick heading) would be
  // compared only with more of itself and come out white.
  const solidInk = sorted[Math.floor(sorted.length * 0.6)] * 0.45;
  const stride = width + 1;
  const sums = brightnessSums(data, width, height);
  const reach = Math.max(4, Math.round(Math.max(width, height) / 32));
  // Ink must be this much darker than its surroundings to count.
  const margin = 0.88;
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

export function applyFilter(filter: ScanFilter, data: Uint8ClampedArray, width: number, height: number): void {
  if (filter === "enhance") {
    evenLighting(data, width, height);
    whitenPaper(data);
  } else if (filter === "gray") {
    toGray(data);
    evenLighting(data, width, height);
    whitenPaper(data);
  } else if (filter === "bw") {
    toBlackAndWhite(data, width, height);
  }
}
