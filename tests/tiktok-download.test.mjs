import assert from "node:assert/strict";
import test from "node:test";
import { tiktokFrameSize } from "../app/recorder/_lib/tiktok-download.ts";

test("a 1080p recording becomes 1080×1920", () => {
  assert.deepEqual(tiktokFrameSize(1920, 1080), { width: 1080, height: 1920 });
});

test("a 720p recording becomes 720×1280, so it's never enlarged", () => {
  assert.deepEqual(tiktokFrameSize(1280, 720), { width: 720, height: 1280 });
});

test("odd sizes round to even numbers, which video encoders need", () => {
  assert.deepEqual(tiktokFrameSize(1367, 769), { width: 770, height: 1368 });
});
