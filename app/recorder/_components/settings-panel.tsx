"use client";

import type { ReactNode } from "react";
import type { CaptionModel } from "@/app/recorder/_hooks/use-caption-model";
import type { MediaDevice } from "@/app/recorder/_hooks/use-devices";
import { VIDEO_CODECS } from "@/constants/recorder";
import type {
  BubbleCorner,
  BubbleSize,
  FrameRate,
  RecorderSettings,
  RecordingSource,
  Resolution,
  VideoCodecChoice,
} from "@/app/recorder/_lib/types";

interface SettingsPanelProps {
  settings: RecorderSettings;
  onChange: (settings: RecorderSettings) => void;
  disabled: boolean;
  screenSupported: boolean;
  onSourceChange: (source: RecordingSource) => void;
  cameras: MediaDevice[];
  cameraError: string | null;
  onCameraToggle: (enabled: boolean) => void;
  floatingBubble: { supported: boolean; isOpen: boolean; open: () => void; close: () => void };
  microphones: MediaDevice[];
  micLevel: number;
  onMicToggle: (enabled: boolean) => void;
  onDeviceListOpen: () => void;
  captionModel: CaptionModel;
  onCaptionsToggle: (enabled: boolean) => void;
  // Codecs this computer can record; a choice is shown when there's more than one.
  codecs: VideoCodecChoice[];
}

const SOURCES: { value: RecordingSource; label: string }[] = [
  { value: "screen", label: "Screen" },
  { value: "camera", label: "Camera only" },
];

const CORNERS: { value: BubbleCorner; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

const control =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-700 dark:bg-zinc-900";
const hint = "text-base leading-relaxed text-zinc-500 dark:text-zinc-400";

function choiceClass(selected: boolean): string {
  return `rounded-xl border px-3 py-2.5 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    selected
      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
  }`;
}

function Section({ title, disabled, children }: { title: string; disabled: boolean; children: ReactNode }) {
  return (
    <fieldset
      disabled={disabled}
      className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <legend className="px-1.5 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-base text-zinc-700 dark:text-zinc-300">
      {label}
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-base font-medium text-zinc-800 dark:text-zinc-200">
      {label}
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-red-600"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function DeviceSelect({
  devices,
  value,
  onOpen,
  onChange,
}: {
  devices: MediaDevice[];
  value: string | undefined;
  onOpen: () => void;
  onChange: (deviceId: string | undefined) => void;
}) {
  return (
    <select
      className={control}
      value={value ?? ""}
      onFocus={onOpen}
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      <option value="">System default</option>
      {devices.map((device) => (
        <option key={device.deviceId} value={device.deviceId}>
          {device.label}
        </option>
      ))}
    </select>
  );
}

function captionStatusText({ status, installFailed }: CaptionModel): string {
  switch (status) {
    case "checking":
      return "Checking on-device speech support…";
    case "unsupported":
      return "Needs a recent Chrome or Edge with on-device speech recognition.";
    case "unavailable":
      return "On-device English speech recognition isn't available on this computer.";
    case "downloadable":
      return installFailed
        ? "Couldn't download the English speech model. Try again."
        : "One-time setup: Chrome downloads its English speech model (about a minute).";
    case "downloading":
      return "Downloading the English speech model…";
    case "available":
      return "Ready. Speech is transcribed on this computer — your voice never leaves it.";
  }
}

export function SettingsPanel({
  settings,
  onChange,
  disabled,
  screenSupported,
  onSourceChange,
  cameras,
  cameraError,
  onCameraToggle,
  floatingBubble,
  microphones,
  micLevel,
  onMicToggle,
  onDeviceListOpen,
  captionModel,
  onCaptionsToggle,
  codecs,
}: SettingsPanelProps) {
  const update = (patch: Partial<RecorderSettings>) => onChange({ ...settings, ...patch });
  const recordsScreen = settings.source === "screen";
  const captionsImpossible =
    captionModel.status === "unsupported" || captionModel.status === "unavailable";

  return (
    <aside className="flex flex-col gap-5">
      <Section title="Record" disabled={disabled}>
        <div className="grid grid-cols-2 gap-2">
          {SOURCES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              aria-pressed={settings.source === value}
              disabled={value === "screen" && !screenSupported}
              onClick={() => onSourceChange(value)}
              className={choiceClass(settings.source === value)}
            >
              {label}
            </button>
          ))}
        </div>
        {!screenSupported && (
          <p className={hint}>Screen recording needs Chrome or Edge on a computer.</p>
        )}
      </Section>

      <Section title="Camera" disabled={disabled}>
        <Toggle label="Use camera" checked={settings.camera.enabled} onChange={onCameraToggle} />
        {settings.camera.enabled && (
          <>
            <Field label="Camera">
              <DeviceSelect
                devices={cameras}
                value={settings.camera.deviceId}
                onOpen={onDeviceListOpen}
                onChange={(deviceId) => update({ camera: { ...settings.camera, deviceId } })}
              />
            </Field>
            {cameraError && (
              <p className="text-base text-amber-700 dark:text-amber-400">{cameraError}</p>
            )}

            {recordsScreen && floatingBubble.supported && (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={floatingBubble.isOpen ? floatingBubble.close : floatingBubble.open}
                  className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-base font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {floatingBubble.isOpen ? "Hide floating bubble" : "Show floating bubble"}
                </button>
                <p className={hint}>
                  Floats on top of every app so you can see yourself. Drag it anywhere.
                </p>
              </div>
            )}

            {recordsScreen && (
              <>
                <p className="text-base font-medium text-zinc-800 dark:text-zinc-200">
                  Bubble position when you share a window or tab
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CORNERS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={settings.camera.corner === value}
                      onClick={() => update({ camera: { ...settings.camera, corner: value } })}
                      className={choiceClass(settings.camera.corner === value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Field label="Bubble size">
                  <select
                    className={control}
                    value={settings.camera.size}
                    onChange={(event) =>
                      update({ camera: { ...settings.camera, size: event.target.value as BubbleSize } })
                    }
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </Field>
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Microphone" disabled={disabled}>
        <Toggle label="Include microphone" checked={settings.mic.enabled} onChange={onMicToggle} />
        {settings.mic.enabled && (
          <>
            <Field label="Input device">
              <DeviceSelect
                devices={microphones}
                value={settings.mic.deviceId}
                onOpen={onDeviceListOpen}
                onChange={(deviceId) => update({ mic: { ...settings.mic, deviceId } })}
              />
            </Field>
            <Field label="Microphone volume">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                className="accent-red-600"
                value={settings.mic.gain}
                onChange={(event) =>
                  update({ mic: { ...settings.mic, gain: Number(event.target.value) } })
                }
              />
            </Field>
            <div className="flex flex-col gap-2 text-base text-zinc-700 dark:text-zinc-300">
              Input level
              <div className="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-[width] duration-75"
                  style={{ width: `${Math.min(1, micLevel) * 100}%` }}
                />
              </div>
            </div>
          </>
        )}
      </Section>

      <Section title="Captions" disabled={disabled}>
        <Toggle
          label="Live English captions and transcript"
          checked={settings.captions.enabled && !captionsImpossible}
          disabled={captionsImpossible}
          onChange={onCaptionsToggle}
        />
        {settings.captions.enabled && !captionsImpossible && (
          <>
            <Toggle
              label="Also show captions inside the video"
              checked={settings.captions.burnIn}
              onChange={(burnIn) => update({ captions: { ...settings.captions, burnIn } })}
            />
            <p className={hint}>
              After recording you can read the transcript, jump to any line, and
              download a .srt caption file for YouTube or your video editor.
            </p>
            {(captionModel.status === "downloadable" || captionModel.installFailed) && (
              <button
                type="button"
                onClick={captionModel.install}
                className="self-start rounded-full bg-zinc-900 px-5 py-2.5 text-base font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Set up English captions
              </button>
            )}
            {!settings.mic.enabled && (
              <p className="text-base text-amber-700 dark:text-amber-400">
                Turn on the microphone — captions come from your voice.
              </p>
            )}
          </>
        )}
        <p className={hint}>{captionStatusText(captionModel)}</p>
      </Section>

      {recordsScreen && (
        <Section title="Computer sound" disabled={disabled}>
          <Toggle
            label="Record computer sound"
            checked={settings.systemAudio.enabled}
            onChange={(enabled) => update({ systemAudio: { ...settings.systemAudio, enabled } })}
          />
          {settings.systemAudio.enabled ? (
            <>
              <Field label="Volume">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  className="accent-red-600"
                  value={settings.systemAudio.gain}
                  onChange={(event) =>
                    update({ systemAudio: { ...settings.systemAudio, gain: Number(event.target.value) } })
                  }
                />
              </Field>
              <p className={hint}>
                When you press Start, Chrome opens on its list of tabs: pick the tab
                playing the sound and keep “Also share tab audio” on. Sharing your
                whole screen includes sound only if Chrome offers “Also share system
                audio”.
              </p>
            </>
          ) : (
            <p className={hint}>
              Off: only your voice is recorded. Turn on to include sound playing on
              your computer, like a video or a demo.
            </p>
          )}
        </Section>
      )}

      <Section title="Quality" disabled={disabled}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Resolution">
            <select
              className={control}
              value={settings.resolution}
              onChange={(event) => update({ resolution: event.target.value as Resolution })}
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </Field>
          <Field label="Frame rate">
            <select
              className={control}
              value={settings.frameRate}
              onChange={(event) => update({ frameRate: Number(event.target.value) as FrameRate })}
            >
              <option value={30}>30 fps</option>
              <option value={60}>60 fps</option>
            </select>
          </Field>
        </div>
        {codecs.length > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-base text-zinc-700 dark:text-zinc-300">File type</p>
            <div className="grid grid-cols-2 gap-2">
              {codecs.map((codec) => (
                <button
                  key={codec}
                  type="button"
                  aria-pressed={settings.codec === codec}
                  onClick={() => update({ codec })}
                  className={choiceClass(settings.codec === codec)}
                >
                  {VIDEO_CODECS[codec].label}
                </button>
              ))}
            </div>
            <p className={hint}>{VIDEO_CODECS[settings.codec].description}</p>
          </div>
        )}
      </Section>
    </aside>
  );
}
