"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { FloatingBubble } from "@/app/recorder/_components/floating-bubble";
import { Notices } from "@/app/recorder/_components/notices";
import { RecorderControls } from "@/app/recorder/_components/recorder-controls";
import { RecorderPreview } from "@/app/recorder/_components/recorder-preview";
import { ReviewPanel } from "@/app/recorder/_components/review-panel";
import { SettingsPanel } from "@/app/recorder/_components/settings-panel";
import { useAudioLevel } from "@/app/recorder/_hooks/use-audio-level";
import { useCamera } from "@/app/recorder/_hooks/use-camera";
import { useCaptionModel } from "@/app/recorder/_hooks/use-caption-model";
import { useDevices } from "@/app/recorder/_hooks/use-devices";
import { useEncodableCodecs, useEncoderWarmUp } from "@/app/recorder/_hooks/use-encoder";
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
import type {
  RecorderSettings,
  RecordingSource,
  TranscriptSegment,
} from "@/app/recorder/_lib/types";

const DEFAULT_SETTINGS: RecorderSettings = {
  source: "screen",
  resolution: "1080p",
  frameRate: 30,
  codec: "avc",
  mic: { enabled: true, gain: 1 },
  systemAudio: { gain: 1 },
  camera: { enabled: false, corner: "bottom-right", size: "medium" },
  captions: { enabled: true, burnIn: true },
};

// A trimmed version of a finished recording, tied to the recording it came from.
interface EditedRecording {
  source: Blob;
  blob: Blob;
  transcript: TranscriptSegment[];
}

type ConfirmAction = { kind: "restart" | "discard"; resumeOnCancel: boolean };

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
  const codecs = useEncodableCodecs(settings.resolution, settings.frameRate);
  useEncoderWarmUp(settings.codec, settings.resolution);

  const playbackRef = useRef<HTMLVideoElement>(null);
  const [edited, setEdited] = useState<EditedRecording | null>(null);
  const recording = recorder.blob
    ? edited?.source === recorder.blob
      ? edited
      : { source: recorder.blob, blob: recorder.blob, transcript: recorder.transcript }
    : null;
  const playbackUrl = useObjectUrl(recording?.blob ?? null);

  const isIdle =
    !recorder.isCountingDown &&
    (recorder.status === "idle" || recorder.status === "stopped");
  const isActive = recorder.status === "recording" || recorder.status === "paused";

  // Restart and Discard pause the recording while asking, like Loom. A
  // blocking confirm() would freeze the video capture instead.
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const confirming = isActive ? confirmAction : null;
  const askToConfirm = (kind: ConfirmAction["kind"]) => {
    const resumeOnCancel = recorder.status === "recording";
    recorder.pause();
    setConfirmAction({ kind, resumeOnCancel });
  };
  const handleConfirm = () => {
    if (confirming?.kind === "restart") {
      recorder.restart();
    } else if (confirming?.kind === "discard") {
      recorder.discard();
    }
    setConfirmAction(null);
  };
  const handleCancelConfirm = () => {
    if (confirming?.resumeOnCancel) {
      recorder.resume();
    }
    setConfirmAction(null);
  };
  // Nothing is recorded yet during the countdown, so there's nothing to confirm.
  const handleDiscard = () => (isActive ? askToConfirm("discard") : recorder.discard());

  const startRecording = () => {
    setEdited(null);
    setConfirmAction(null);
    void recorder.start(settings, {
      cameraStream: camera.stream,
      floatingBubbleOpen: bubble.pipWindow !== null,
    });
  };
  const togglePause = () => {
    if (confirming) {
      return;
    }
    if (recorder.status === "paused") {
      recorder.resume();
    } else {
      recorder.pause();
    }
  };

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
    setSettings((prev) => ({ ...prev, captions: { ...prev.captions, enabled } }));
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
          isFinishing={recorder.isFinishing}
          elapsedSeconds={recorder.elapsedSeconds}
          playbackUrl={playbackUrl}
          playbackRef={playbackRef}
        />
        <RecorderControls
          status={recorder.status}
          isCountingDown={recorder.isCountingDown}
          isFinishing={recorder.isFinishing}
          disabled={!isSupported}
          onStart={startRecording}
          onPause={recorder.pause}
          onResume={recorder.resume}
          onStop={recorder.stop}
          onRestart={() => askToConfirm("restart")}
          onDiscard={handleDiscard}
          confirming={confirming?.kind ?? null}
          onConfirm={handleConfirm}
          onCancelConfirm={handleCancelConfirm}
        />
        {recorder.status === "stopped" && recording && (
          <ReviewPanel
            key={playbackUrl}
            blob={recording.blob}
            transcript={recording.transcript}
            isTrimmed={recording.blob !== recording.source}
            playbackRef={playbackRef}
            onTrimmed={(blob, transcript) =>
              setEdited({ source: recording.source, blob, transcript })
            }
            onUndoTrim={() => setEdited(null)}
          />
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
        codecs={codecs}
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
