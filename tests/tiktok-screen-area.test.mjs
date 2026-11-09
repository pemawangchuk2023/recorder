import assert from "node:assert/strict";
import test from "node:test";
import { fillFrameArea, isTikTokScreen } from "../app/recorder/_lib/tiktok-screen-area.ts";

const WHOLE = { x: 0, y: 0, width: 1, height: 1 };
const WIDE = 16 / 9;
const FRAME = 9 / 16;
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

const settings = (source, camera, tiktok) => ({
  source,
  camera: { enabled: camera },
  tiktokScreen: { enabled: tiktok },
});

test("TikTok size applies to Screen mode when it's chosen", () => {
  assert.equal(isTikTokScreen(settings("screen", false, true)), true);
  assert.equal(isTikTokScreen(settings("screen", false, false)), false);
});

test("TikTok size never applies to Screen + Cam or Camera", () => {
  assert.equal(isTikTokScreen(settings("screen", true, true)), false);
  assert.equal(isTikTokScreen(settings("camera", true, true)), false);
});

test("filling a wide screen gives a centred, full-height box of the video's shape", () => {
  const area = fillFrameArea(WHOLE, WIDE, FRAME);
  close(area.height, 1);
  close((area.width * WIDE) / area.height, FRAME);
  close(area.x + area.width / 2, 0.5);
});

test("filling a tall shared tab stays at full width", () => {
  const area = fillFrameArea(WHOLE, 0.5, FRAME);
  close(area.width, 1);
  close((area.width * 0.5) / area.height, FRAME);
});

test("filling keeps the box on the screen", () => {
  const area = fillFrameArea({ x: 0.9, y: 0.5, width: 0.1, height: 0.5 }, WIDE, FRAME);
  assert.ok(area.x >= 0 && area.x + area.width <= 1 + 1e-9);
  close((area.width * WIDE) / area.height, FRAME);
});
