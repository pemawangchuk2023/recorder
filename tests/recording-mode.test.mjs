import assert from "node:assert/strict";
import test from "node:test";
import { modeOf, withMode } from "../app/recorder/_lib/recording-mode.ts";

const base = { source: "screen", verticalScreen: false, camera: { enabled: false } };

for (const mode of ["screen-camera", "screen", "camera", "tiktok-screen"]) {
  test(`${mode} survives being set and read back`, () => {
    assert.equal(modeOf(withMode(base, mode)), mode);
  });
}

test("TikTok Screen records the screen with the camera off", () => {
  const settings = withMode(withMode(base, "screen-camera"), "tiktok-screen");
  assert.equal(settings.source, "screen");
  assert.equal(settings.camera.enabled, false);
  assert.equal(settings.verticalScreen, true);
});

test("leaving TikTok Screen returns plain Screen to its normal shape", () => {
  const settings = withMode(withMode(base, "tiktok-screen"), "screen");
  assert.equal(modeOf(settings), "screen");
  assert.equal(settings.verticalScreen, false);
});
