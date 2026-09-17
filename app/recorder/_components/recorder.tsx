"use client";

import { useState, useSyncExternalStore } from "react";
import { Notices } from "@/app/recorder/_components/notices";
import { RecorderControls } from "@/app/recorder/_components/recorder-controls";
import { RecorderPreview } from "@/app/recorder/_components/recorder-preview";
import { SavePanel } from "@/app/recorder/_components/save-panel";
import { SettingsPanel } from "@/app/recorder/_components/settings-panel";
import { useAudioLevel } from "@/app/recorder/_hooks/use-audio-level";
import { useCaptionModel } from "@/app/recorder/_hooks/use-caption-model";
import { useKeyboardShortcuts } from "@/app/recorder/_hooks/use-keyboard-shortcuts";
import { useMicrophones } from "@/app/recorder/_hooks/use-microphones";
import { useObjectUrl } from "@/app/recorder/_hooks/use-object-url";
import { useScreenRecorder } from "@/app/recorder/_hooks/use-screen-recorder";
import { isRecordingSupported } from "@/app/recorder/_lib/recording-format";
import type { RecorderSettings } from "@/app/recorder/_lib/types";

const DEFAULT_SETTINGS: RecorderSettings = {
  resolution: "1080p",
  frameRate: 30,
  mic: { enabled: true, gain: 1 },
  systemAudio: { gain: 1 },
  webcam: { enabled: false, corner: "bottom-right", size: "medium" },
  captions: { enabled: true },
};

// Browser support can only be checked on the client. Assume "supported" while
// server rendering so the first client render matches the HTML.
const subscribe = () => () => {};
const getServerSnapshot = () => true;

export function Recorder() {
  const isSupported = useSyncExternalStore(subscribe, isRecordingSupported, getServerSnapshot);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  const recorder = useScreenRecorder();
  const microphones = useMicrophones();
  const captionModel = useCaptionModel();
  const micLevel = useAudioLevel(recorder.micAnalyser);
  const playbackUrl = useObjectUrl(recorder.blob);

  const isIdle =
    !recorder.isCountingDown &&
    (recorder.status === "idle" || recorder.status === "stopped");

  const startRecording = () => void recorder.start(settings);
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

  const handleMicToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, mic: { ...prev.mic, enabled } }));
    if (enabled) {
      void microphones.requestPermission();
    }
  };

  const handleCaptionsToggle = (enabled: boolean) => {
    setSettings((prev) => ({ ...prev, captions: { enabled } }));
    if (enabled) {
      captionModel.install();
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {!isSupported && (
          <p
            role="alert"
            className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            Screen recording isn&apos;t supported in this browser. Please use an
            up-to-date Chrome or Edge on desktop.
          </p>
        )}
        <Notices error={recorder.error} notices={recorder.notices} />
        <RecorderPreview
          status={recorder.status}
          previewStream={recorder.previewStream}
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
        microphones={microphones.microphones}
        micLevel={micLevel}
        onMicToggle={handleMicToggle}
        onMicListOpen={() =>
          void (microphones.labelsAvailable
            ? microphones.refresh()
            : microphones.requestPermission())
        }
        captionModel={captionModel}
        onCaptionsToggle={handleCaptionsToggle}
      />
    </div>
  );
}
