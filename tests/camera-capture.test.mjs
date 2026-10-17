import assert from "node:assert/strict";
import test from "node:test";
import { cameraConstraints, cameraQualityNotice, improveCameraCapture, openCamera } from "../app/recorder/_lib/camera-capture.ts";

const target = { width: 1920, height: 1080, frameRate: 30 };

function camera(settings, capabilities = {}, reject = false) {
  let constraints = cameraConstraints(target);
  const calls = [];
  return {
    calls,
    readyState: "live",
    getSettings: () => settings,
    getCapabilities: () => capabilities,
    getConstraints: () => constraints,
    async applyConstraints(next) {
      calls.push(next);
      if (reject) throw new DOMException("Unsupported mode", "OverconstrainedError");
      constraints = next;
      if (next.width?.min) {
        settings = { ...settings, width: next.width.min, height: next.height.min };
      }
    },
  };
}

test("requests the selected resolution and fps with native output preferred", () => {
  const requested = cameraConstraints({ width: 3840, height: 2160, frameRate: 60 });
  assert.equal(requested.width.ideal, 3840);
  assert.equal(requested.height.ideal, 2160);
  assert.equal(requested.frameRate.ideal, 60);
  assert.equal(requested.resizeMode.ideal, "none");
});

test("renegotiates a low resolution result and retains the improved mode with autofocus", async () => {
  const track = camera({ width: 640, height: 480, frameRate: 30 }, {
    width: { max: 1920 }, height: { max: 1080 }, focusMode: ["manual", "continuous"],
  });
  await improveCameraCapture(track, target);
  assert.equal(track.calls.length, 2);
  assert.equal(track.calls[0].width.min, 1920);
  assert.equal(track.calls[1].width.min, 1920);
  assert.equal(track.calls[1].advanced[0].focusMode, "continuous");
  assert.equal(cameraQualityNotice(track, target), null);
});

test("uses a lower camera capability instead of demanding unsupported full HD", async () => {
  const track = camera({ width: 640, height: 480 }, {
    width: { max: 1280 }, height: { max: 720 },
  });
  await improveCameraCapture(track, target);
  assert.equal(track.calls[0].width.min, 1280);
  assert.equal(track.calls[0].height.min, 720);
  assert.match(cameraQualityNotice(track, target), /1280 × 720/);
});

test("driver rejection preserves working capture and reports actual quality", async () => {
  const track = camera({ width: 640, height: 480, frameRate: 15 }, { focusMode: ["continuous"] }, true);
  await improveCameraCapture(track, target);
  assert.equal(track.readyState, "live");
  assert.match(cameraQualityNotice(track, target), /640 × 480 at 15 fps/);
});

test("fixed-focus cameras meeting the target need no changes", async () => {
  const track = camera(target, { focusMode: ["manual"] });
  await improveCameraCapture(track, target);
  assert.equal(track.calls.length, 0);
  assert.equal(cameraQualityNotice(track, target), null);
});

test("missing capability API is supported and low fps is reported", async () => {
  const track = camera({ ...target, frameRate: 15 });
  track.getCapabilities = undefined;
  await improveCameraCapture(track, target);
  assert.match(cameraQualityNotice(track, target), /15 fps/);
});

function media(...results) {
  const requests = [];
  return {
    requests,
    async getUserMedia(constraints) {
      requests.push(constraints.video);
      const next = results.shift();
      if (next instanceof Error) throw next;
      return next;
    },
  };
}

function stream(track) {
  return { getVideoTracks: () => [track], getTracks: () => [track] };
}

const noWait = async () => {};

test("a busy camera is reopened after a pause with plain constraints", async () => {
  const track = camera(target);
  const devices = media(new DOMException("Could not start video source", "NotReadableError"), stream(track));
  const waits = [];
  const opened = await openCamera("cam-1", target, { media: devices, wait: async (ms) => waits.push(ms) });
  assert.equal(opened.getVideoTracks()[0], track);
  assert.equal(waits.length, 1);
  assert.equal(devices.requests[1].deviceId.exact, "cam-1");
  assert.equal(devices.requests[1].resizeMode, undefined);
});

test("an unplugged remembered camera falls back to the default camera", async () => {
  const track = camera(target);
  const missing = () => new DOMException("Requested device not found", "NotFoundError");
  const devices = media(missing(), missing(), stream(track));
  await openCamera("gone", target, { media: devices, wait: noWait });
  assert.equal(devices.requests[2].deviceId, undefined);
});

test("a track ended by renegotiation is replaced by a plain capture", async () => {
  const ended = camera({ width: 640, height: 480 }, { width: { max: 1920 }, height: { max: 1080 } });
  ended.applyConstraints = async () => { ended.readyState = "ended"; };
  ended.stop = () => {};
  const fresh = camera(target);
  const devices = media(stream(ended), stream(fresh));
  const opened = await openCamera(undefined, target, { media: devices, wait: noWait });
  assert.equal(opened.getVideoTracks()[0], fresh);
});

test("a denied permission is not retried", async () => {
  const devices = media(new DOMException("Permission denied", "NotAllowedError"));
  await assert.rejects(openCamera(undefined, target, { media: devices, wait: noWait }), { name: "NotAllowedError" });
  assert.equal(devices.requests.length, 1);
});

test("isBlankFrame flags a black frame with a small icon but not a real picture", async () => {
  const { isBlankFrame } = await import("../app/recorder/_lib/camera-capture.ts");
  const frame = (pixels, bright) => {
    const data = new Uint8ClampedArray(pixels * 4);
    for (let i = 0; i < bright; i++) data.fill(255, i * 4, i * 4 + 3);
    return data;
  };
  assert.equal(isBlankFrame(frame(576, 10)), true);
  assert.equal(isBlankFrame(frame(576, 200)), false);
  assert.equal(isBlankFrame(new Uint8ClampedArray(0)), false);
});
