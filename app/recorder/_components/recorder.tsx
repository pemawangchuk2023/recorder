"use client";

import { useState, useSyncExternalStore } from "react";
import { FloatingBubble } from "@/app/recorder/_components/floating-bubble";
import { Notices } from "@/app/recorder/_components/notices";
import { RecorderControls } from "@/app/recorder/_components/recorder-controls";
import { RecorderPreview } from "@/app/recorder/_components/recorder-preview";
import { SavePanel } from "@/app/recorder/_components/save-panel";
import { SettingsPanel } from "@/app/recorder/_components/settings-panel";
import { useAudioLevel } from "@/app/recorder/_hooks/use-audio-level";
import { useCamera } from "@/app/recorder/_hooks/use-camera";
import { useCaptionModel } from "@/app/recorder/_hooks/use-caption-model";
import { useDevices } from "@/app/recorder/_hooks/use-devices";
import {
  isFloatingBubbleSupported,
  useFloatingBubble,
} from "@/app/recorder/_hooks/use-floating-bubble";
import { useKeyboardShortcuts } from "@/app/recorder/_hooks/use-keyboard-shortcuts";
import { useObjectUrl } from "@/app/recorder/_hooks/use-object-url";
import { useScreenRecorder } from "@/app/recorder/_hooks/use-screen-recorder";
import {
  isRecordingSupported,
  isScreenCaptureSupported,
} from "@/app/recorder/_lib/recording-format";
import type { RecorderSettings, RecordingSource } from "@/app/recorder/_lib/types";

const DEFAULT_SETTINGS: RecorderSettings = {
  source: "screen",
  resolution: "1080p",
  frameRate: 30,
  mic: { enabled: true, gain: 1 },
  systemAudio: { gain: 1 },
  camera: { enabled: false, corner: "bottom-right", size: "medium" },
  captions: { enabled: true },
};

// Browser features can only be checked on the client. The server snapshot is
// what's rendered into the HTML; React switches to the real value after hydration.
const subscribe = () => () => {};
const trueOnServer = () => true;
const falseOnServer = () => false;

export function Recorder() {
  const isSupported = useSyncExternalStore(subscribe, isRecordingSupported, trueOnServer);
  const screenSupported = useSyncExternalStore(subscribe, isScreenCaptureSupported, trueOnServer);
  const bubbleSupported = useSyncExternalStore(subscribe, isFloatingBubbleSupported, falseOnServer);

  const [chosenSettings, setSettings] = useState(DEFAULT_SETTINGS);
  // Phones can't share their screen, so they always record the camera.
  const settings: RecorderSettings = screenSupported
    ? chosenSettings
    : { ...chosenSettings, source: "camera" };

  const recorder = useScreenRecorder();
  const devices = useDevices();
  const camera = useCamera(settings.camera.enabled, settings.camera.deviceId);
  const bubble = useFloatingBubble();
  const captionModel = useCaptionModel();
  const micLevel = useAudioLevel(recorder.micAnalyser);
  const playbackUrl = useObjectUrl(recorder.blob);

  const isIdle =
    !recorder.isCountingDown &&
    (recorder.status === "idle" || recorder.status === "stopped");

  const startRecording = () =>
    void recorder.start(settings, {
      cameraStream: camera.stream,
      floatingBubbleOpen: bubble.pipWindow !== null,
    });
  const togglePause = () =>
    recorder.status === "paused" ? recorder.resume() : recorder.pause();

  useKeyboardShortcuts({
    enabled: isSupported,
    onToggleRecording: isIdle ? startRecording : recorder.stop,
    onTogglePause: togglePause,
  });

  const handleSettingsChange = (next: RecorderSettings) => {
    setSettings(next);
    recorder.setMicGain(next.mic.gain);
    recorder.setSystemAudioGain(next.systemAudio.gain);
  };

  // The floating bubble can only open from a click, so it's opened right here.
  const handleCameraToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, camera: { ...prev.camera, enabled } }));
    if (!enabled) {
      bubble.close();
    } else if (settings.source === "screen" && bubbleSupported) {
      bubble.open();
    }
  };

  const handleSourceChange = (source: RecordingSource) => {
    setSettings((prev) => ({ ...prev, source }));
    if (source === "camera") {
      bubble.close();
    } else if (settings.camera.enabled && bubbleSupported) {
      bubble.open();
    }
  };

  const handleMicToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, mic: { ...prev.mic, enabled } }));
    if (enabled) {
      void devices.requestMicPermission();
    }
  };

  const handleCaptionsToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, captions: { enabled } }));
    if (enabled) {
      captionModel.install();
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col gap-5">
        {!isSupported && (
          <p
            role="alert"
            className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-base text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            Recording isn&apos;t supported in this browser. Please use an
            up-to-date Chrome or Edge.
          </p>
        )}
        <Notices error={recorder.error} notices={recorder.notices} />
        <RecorderPreview
          status={recorder.status}
          previewStream={recorder.previewStream}
          idleStream={settings.source === "camera" ? camera.stream : null}
          countdownValue={recorder.countdownValue}
          elapsedSeconds={recorder.elapsedSeconds}
          playbackUrl={playbackUrl}
        />
        <RecorderControls
          status={recorder.status}
          isCountingDown={recorder.isCountingDown}
          disabled={!isSupported}
          onStart={startRecording}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onStop={recorder.stop}
        />
        {recorder.status === "stopped" && recorder.blob && (
          <SavePanel blob={recorder.blob} />
        )}
      </div>

      <SettingsPanel
        settings={settings}
        onChange={handleSettingsChange}
        disabled={!isIdle}
        screenSupported={screenSupported}
        onSourceChange={handleSourceChange}
        cameras={devices.cameras}
        cameraError={camera.error}
        onCameraToggle={handleCameraToggle}
        floatingBubble={{
          supported: bubbleSupported,
          isOpen: bubble.pipWindow !== null,
          open: bubble.open,
          close: bubble.close,
        }}
        microphones={devices.microphones}
        micLevel={micLevel}
        onMicToggle={handleMicToggle}
        onDeviceListOpen={() =>
          void (devices.labelsAvailable ? devices.refresh() : devices.requestMicPermission())
        }
        captionModel={captionModel}
        onCaptionsToggle={handleCaptionsToggle}
      />

      {bubble.pipWindow && (
        <FloatingBubble
          pipWindow={bubble.pipWindow}
          stream={camera.stream}
          error={camera.error}
          status={recorder.status}
          elapsedSeconds={recorder.elapsedSeconds}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onStop={recorder.stop}
        />
      )}
    </div>
  );
}
