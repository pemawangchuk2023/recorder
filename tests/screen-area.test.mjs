import assert from "node:assert/strict";
import test from "node:test";
import { coverArea, resizeKeepingShape } from "../app/recorder/_lib/screen-area.ts";

const WHOLE = { x: 0, y: 0, width: 1, height: 1 };
const LANDSCAPE = 16 / 9;
const VERTICAL = 9 / 16;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

test("a whole landscape screen becomes a centred full-height 9:16 slice", () => {
  const area = coverArea(WHOLE, LANDSCAPE, VERTICAL);
  close(area.height, 1);
  close((area.width * LANDSCAPE) / area.height, VERTICAL);
  close(area.x + area.width / 2, 0.5);
});

test("an area already shaped 9:16 is left as it is", () => {
  const shaped = { x: 0.2, y: 0.1, width: 0.2, height: (0.2 * LANDSCAPE) / VERTICAL };
  const area = coverArea(shaped, LANDSCAPE, VERTICAL);
  close(area.x, shaped.x);
  close(area.y, shaped.y);
  close(area.width, shaped.width);
  close(area.height, shaped.height);
});

test("a screen narrower than 9:16 loses height instead of width", () => {
  const area = coverArea(WHOLE, 0.5, VERTICAL);
  close(area.width, 1);
  close(area.width * 0.5 / area.height, VERTICAL);
  close(area.y + area.height / 2, 0.5);
});

const RATIO = VERTICAL / LANDSCAPE;

test("resizing keeps the shape and the opposite corner", () => {
  const box = resizeKeepingShape({ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.7 }, { west: false, north: false }, RATIO, 0.1);
  close(box.x, 0.1);
  close(box.y, 0.1);
  close(box.height, 0.6);
  close(box.width / box.height, RATIO);
});

test("resizing stops at the edge of the screen", () => {
  const box = resizeKeepingShape({ x: 0.5, y: 0.5 }, { x: 0.9, y: 2 }, { west: false, north: false }, RATIO, 0.1);
  close(box.y + box.height, 1);
  close(box.width / box.height, RATIO);
});

test("resizing never goes below the smallest size in either direction", () => {
  const box = resizeKeepingShape({ x: 0.5, y: 0.8 }, { x: 0.5, y: 0.8 }, { west: true, north: true }, RATIO, 0.1);
  close(box.width, 0.1);
  close(box.x + box.width, 0.5);
  close(box.y + box.height, 0.8);
});
