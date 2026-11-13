import assert from "node:assert/strict";
import test from "node:test";
import { detectPage, splitLevel } from "../app/scan/_lib/detect-edges.ts";
import { applyFilter, evenLighting, toBlackAndWhite, whitenPaper } from "../app/scan/_lib/filters.ts";
import { FULL_FRAME, isConvex, outputSize, pageToPhoto, rotate, straighten } from "../app/scan/_lib/geometry.ts";
import { buildPdf, jpegColorSpace, layoutPage } from "../app/scan/_lib/pdf.ts";

const near = (actual, expected, tolerance = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);

// A grey "photo" of a bright four-sided page on a dark desk.
function photoOfPage(width, height, corners, { paper = 220, desk = 40 } = {}) {
  const gray = new Uint8Array(width * height).fill(desk);
  const inside = (x, y) => {
    for (let index = 0; index < 4; index++) {
      const a = corners[index];
      const b = corners[(index + 1) % 4];
      if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < 0) {
        return false;
      }
    }
    return true;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (inside(x, y)) {
        gray[y * width + x] = paper;
      }
    }
  }
  return gray;
}

function rgbaFromGray(gray) {
  const data = new Uint8ClampedArray(gray.length * 4);
  gray.forEach((level, index) => data.set([level, level, level, 255], index * 4));
  return data;
}

// ---------------------------------------------------------------- finding the page

test("bright and dark are split between the two, wherever they sit", () => {
  const gray = new Uint8Array(1000).fill(60);
  gray.fill(200, 400);
  const level = splitLevel(gray);
  assert.ok(level >= 60 && level < 200, `level ${level}`);
});

test("a page shot at an angle on a dark desk is found, corner by corner", () => {
  const corners = [
    { x: 50, y: 30 },
    { x: 250, y: 50 },
    { x: 270, y: 200 },
    { x: 30, y: 180 },
  ];
  const found = detectPage(photoOfPage(320, 240, corners), 320, 240);
  assert.ok(found, "no page found");
  found.forEach((corner, index) => {
    near(corner.x * 319, corners[index].x, 3);
    near(corner.y * 239, corners[index].y, 3);
  });
  assert.ok(isConvex(found));
});

test("small bright specks elsewhere don't distract from the page", () => {
  const corners = [
    { x: 60, y: 40 },
    { x: 240, y: 40 },
    { x: 240, y: 200 },
    { x: 60, y: 200 },
  ];
  const gray = photoOfPage(320, 240, corners);
  for (let y = 5; y < 12; y++) {
    gray.fill(255, y * 320 + 290, y * 320 + 300);
  }
  const found = detectPage(gray, 320, 240);
  assert.ok(found);
  near(found[0].x * 319, 60, 2);
  near(found[2].y * 239, 200, 2);
});

test("a page filling the whole photo has no edges to find", () => {
  assert.equal(detectPage(new Uint8Array(320 * 240).fill(230), 320, 240), null);
});

test("scattered highlights aren't mistaken for a page", () => {
  const gray = new Uint8Array(320 * 240).fill(40);
  // A thin bright frame: large outline, almost nothing inside it.
  for (let x = 40; x < 280; x++) {
    for (let t = 0; t < 12; t++) {
      gray[(40 + t) * 320 + x] = 230;
      gray[(190 + t) * 320 + x] = 230;
    }
  }
  for (let y = 40; y < 202; y++) {
    for (let t = 0; t < 12; t++) {
      gray[y * 320 + 40 + t] = 230;
      gray[y * 320 + 268 + t] = 230;
    }
  }
  assert.equal(detectPage(gray, 320, 240), null);
});

// ---------------------------------------------------------------- straightening

test("the page's corners map onto the photo's marked corners", () => {
  const corners = [
    { x: 10, y: 20 },
    { x: 90, y: 5 },
    { x: 110, y: 95 },
    { x: 0, y: 80 },
  ];
  const map = pageToPhoto(corners);
  const targets = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  targets.forEach(([u, v], index) => {
    const point = map(u, v);
    near(point.x, corners[index].x, 1e-9);
    near(point.y, corners[index].y, 1e-9);
  });
});

test("straight lines on the page stay straight", () => {
  const map = pageToPhoto([
    { x: 10, y: 20 },
    { x: 90, y: 5 },
    { x: 110, y: 95 },
    { x: 0, y: 80 },
  ]);
  const a = map(0.2, 0.2);
  const b = map(0.5, 0.5);
  const c = map(0.8, 0.8);
  near((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x), 0, 1e-9);
});

test("the straightened page is as big as its longest edges in the photo", () => {
  const size = outputSize(
    [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.8, y: 0.9 },
      { x: 0.2, y: 0.9 },
    ],
    1000,
    500
  );
  assert.deepEqual(size, { width: 800, height: Math.round(Math.hypot(100, 400)) });
});

test("a huge photo is scaled down to a sensible scan size", () => {
  assert.deepEqual(outputSize(FULL_FRAME, 6000, 4000, 2400), { width: 2400, height: 1600 });
});

test("a tilted page comes out as a full, flat rectangle of paper", () => {
  const corners = [
    { x: 50, y: 30 },
    { x: 250, y: 50 },
    { x: 270, y: 200 },
    { x: 30, y: 180 },
  ];
  const gray = photoOfPage(320, 240, corners);
  const fractions = corners.map((corner) => ({ x: corner.x / 319, y: corner.y / 239 }));
  // Pulled in a touch, as a person would place them just inside the edge.
  const inset = fractions.map((corner) => ({ x: 0.5 + (corner.x - 0.5) * 0.97, y: 0.5 + (corner.y - 0.5) * 0.97 }));
  const page = straighten({ data: rgbaFromGray(gray), width: 320, height: 240 }, inset);
  let paper = 0;
  for (let index = 0; index < page.data.length; index += 4) {
    if (page.data[index] > 200) {
      paper++;
    }
  }
  assert.ok(paper / (page.width * page.height) > 0.995, "desk showed through");
});

test("corners that cross over aren't a page outline", () => {
  assert.equal(isConvex(FULL_FRAME), true);
  assert.equal(
    isConvex([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ]),
    false
  );
});

test("a quarter turn clockwise moves the top-left pixel to the top right", () => {
  const data = new Uint8ClampedArray(3 * 2 * 4);
  data.set([255, 0, 0, 255], 0);
  const turned = rotate({ data, width: 3, height: 2 }, 1);
  assert.equal(turned.width, 2);
  assert.equal(turned.height, 3);
  assert.deepEqual([...turned.data.subarray(4, 8)], [255, 0, 0, 255]);
  const back = rotate(turned, 3);
  assert.deepEqual([...back.data], [...data]);
});

// ---------------------------------------------------------------- clean-up

test("enhancing turns greyish paper white and keeps ink dark", () => {
  const data = new Uint8ClampedArray(100 * 4);
  for (let pixel = 0; pixel < 100; pixel++) {
    const level = pixel < 8 ? 40 : 170;
    data.set([level, level, level, 255], pixel * 4);
  }
  whitenPaper(data);
  assert.equal(data[50 * 4], 255);
  assert.ok(data[0] < 20);
});

test("black and white ignores a shadow across the page", () => {
  const width = 200;
  const height = 100;
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Paper gets darker to the right (a shadow); ink is a stripe on each half.
      const paper = 230 - x * 0.6;
      const ink = (x > 40 && x < 46) || (x > 150 && x < 156);
      gray[y * width + x] = ink ? paper * 0.35 : paper;
    }
  }
  const data = rgbaFromGray(gray);
  toBlackAndWhite(data, width, height);
  const at = (x, y) => data[(y * width + x) * 4];
  assert.equal(at(43, 50), 0, "ink in the light half");
  assert.equal(at(153, 50), 0, "ink in the shadow");
  assert.equal(at(20, 50), 255, "paper in the light half");
  assert.equal(at(190, 50), 255, "paper in the shadow");
});

test("black and white keeps a solid shape solid, not just its outline", () => {
  const width = 200;
  const height = 200;
  const gray = new Uint8Array(width * height).fill(220);
  for (let y = 50; y < 150; y++) {
    gray.fill(70, y * width + 50, y * width + 150);
  }
  const data = rgbaFromGray(gray);
  toBlackAndWhite(data, width, height);
  assert.equal(data[(100 * width + 100) * 4], 0, "the middle of the block");
  assert.equal(data[(20 * width + 20) * 4], 255, "the paper");
});

test("uneven lighting is evened out across the page", () => {
  const width = 300;
  const height = 100;
  const gray = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      gray[y * width + x] = 230 - x * 0.3;
    }
  }
  const data = rgbaFromGray(gray);
  evenLighting(data, width, height);
  const left = data[(50 * width + 20) * 4];
  const right = data[(50 * width + 280) * 4];
  assert.ok(Math.abs(left - right) < 8, `still ${left} against ${right}`);
  assert.ok(right > 215);
});

test("the original look leaves the pixels alone", () => {
  const data = new Uint8ClampedArray([10, 20, 30, 255, 200, 100, 50, 255]);
  applyFilter("original", data, 2, 1);
  assert.deepEqual([...data], [10, 20, 30, 255, 200, 100, 50, 255]);
});

// ---------------------------------------------------------------- PDF

// The smallest thing shaped like a JPEG header: start marker, then a frame
// block saying 3 colour channels.
function fakeJpeg(channels, bytes = 64) {
  const jpeg = new Uint8Array(bytes).fill(0x55);
  jpeg.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x10, 0x00, 0x10, channels]);
  return jpeg;
}

test("a JPEG's colour type is read from its own header", () => {
  assert.equal(jpegColorSpace(fakeJpeg(3)), "DeviceRGB");
  assert.equal(jpegColorSpace(fakeJpeg(1)), "DeviceGray");
});

test("a portrait scan fills an A4 sheet; a wide one turns it sideways", () => {
  const portrait = layoutPage(1240, 1754, "a4");
  near(portrait.sheetWidth, 595.28);
  near(portrait.drawWidth, 595.28, 0.5);
  const wide = layoutPage(2000, 1000, "a4");
  near(wide.sheetWidth, 841.89);
  near(wide.y, (595.28 - wide.drawHeight) / 2);
});

test("'same shape' makes the sheet match the scan exactly", () => {
  const layout = layoutPage(1000, 500, "fit");
  near(layout.sheetHeight, layout.sheetWidth / 2);
  near(layout.drawHeight, layout.sheetHeight);
});

test("the PDF's index points at every object, and each page's picture is inside untouched", () => {
  const pages = [
    { jpeg: fakeJpeg(3, 300), width: 1240, height: 1754 },
    { jpeg: fakeJpeg(3, 500), width: 1754, height: 1240 },
  ];
  const pdf = buildPdf(pages, { title: "Rental agreement — signed", size: "a4", date: new Date(Date.UTC(2026, 10, 13)) });
  const text = Buffer.from(pdf).toString("latin1");
  assert.ok(text.startsWith("%PDF-1.4\n"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/Count 2 /);

  const start = Number(/startxref\n(\d+)\n%%EOF/.exec(text)[1]);
  assert.ok(text.startsWith("xref\n", start), "startxref doesn't point at the index");
  const header = /xref\n0 (\d+)\n/.exec(text.slice(start));
  const count = Number(header[1]);
  assert.equal(count, 3 + pages.length * 3 + 1);
  const rows = text.slice(start + header[0].length).split("\n").slice(0, count);
  rows.forEach((row, id) => {
    if (id === 0) {
      return;
    }
    const offset = Number(row.slice(0, 10));
    assert.ok(text.startsWith(`${id} 0 obj\n`, offset), `object ${id} isn't at ${offset}`);
  });

  // Each declared stream length matches the bytes that follow.
  for (const match of text.matchAll(/\/Length (\d+) >>\nstream\n/g)) {
    const end = match.index + match[0].length + Number(match[1]);
    assert.ok(text.startsWith("\nendstream", end), "a stream's length is wrong");
  }
  const firstPicture = text.indexOf("stream\n", text.indexOf("/DCTDecode")) + 7;
  assert.deepEqual([...pdf.subarray(firstPicture, firstPicture + 300)], [...pages[0].jpeg]);
  // The title survives non-English characters (stored as UTF-16).
  assert.ok(text.includes("/Title <FEFF00520065006E00740061006C"));
  assert.ok(text.includes("(D:20261113000000Z)"));
});
