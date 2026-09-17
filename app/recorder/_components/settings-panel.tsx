"use client";

import type { ReactNode } from "react";
import type { CaptionModel } from "@/app/recorder/_hooks/use-caption-model";
import type { Microphone } from "@/app/recorder/_hooks/use-microphones";
import type {
  FrameRate,
  RecorderSettings,
  Resolution,
  WebcamCorner,
  WebcamSize,
} from "@/app/recorder/_lib/types";

interface SettingsPanelProps {
  settings: RecorderSettings;
  onChange: (settings: RecorderSettings) => void;
  disabled: boolean;
  microphones: Microphone[];
  micLevel: number;
  onMicToggle: (enabled: boolean) => void;
  onMicListOpen: () => void;
  captionModel: CaptionModel;
  onCaptionsToggle: (enabled: boolean) => void;
}

const CORNERS: { value: WebcamCorner; label: string }[] = [
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
];

const control =
  "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-base dark:border-zinc-700 dark:bg-zinc-900";

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
  microphones,
  micLevel,
  onMicToggle,
  onMicListOpen,
  captionModel,
  onCaptionsToggle,
}: SettingsPanelProps) {
  const update = (patch: Partial<RecorderSettings>) => onChange({ ...settings, ...patch });
  const captionsImpossible =
    captionModel.status === "unsupported" || captionModel.status === "unavailable";

  return (
    <aside className="flex flex-col gap-5">
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
      </Section>

      <Section title="Microphone" disabled={disabled}>
        <Toggle label="Include microphone" checked={settings.mic.enabled} onChange={onMicToggle} />
        {settings.mic.enabled && (
          <>
            <Field label="Input device">
              <select
                className={control}
                value={settings.mic.deviceId ?? ""}
                onFocus={onMicListOpen}
                onChange={(event) =>
                  update({ mic: { ...settings.mic, deviceId: event.target.value || undefined } })
                }
              >
                <option value="">System default</option>
                {microphones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label}
                  </option>
                ))}
              </select>
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

      <Section title="Tab or system audio" disabled={disabled}>
        <Field label="Volume">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            className="accent-red-600"
            value={settings.systemAudio.gain}
            onChange={(event) => update({ systemAudio: { gain: Number(event.target.value) } })}
          />
        </Field>
        <p className="text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          Only recorded when the source you share includes audio — for example a
          Chrome tab with &quot;Also share tab audio&quot; turned on.
        </p>
      </Section>

      <Section title="Webcam" disabled={disabled}>
        <Toggle
          label="Show webcam bubble"
          checked={settings.webcam.enabled}
          onChange={(enabled) => update({ webcam: { ...settings.webcam, enabled } })}
        />
        {settings.webcam.enabled && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {CORNERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.webcam.corner === value}
                  onClick={() => update({ webcam: { ...settings.webcam, corner: value } })}
                  className={`rounded-xl border px-3 py-2.5 text-base font-medium transition-colors ${
                    settings.webcam.corner === value
                      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Field label="Bubble size">
              <select
                className={control}
                value={settings.webcam.size}
                onChange={(event) =>
                  update({ webcam: { ...settings.webcam, size: event.target.value as WebcamSize } })
                }
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </Field>
          </>
        )}
      </Section>

      <Section title="Captions" disabled={disabled}>
        <Toggle
          label="Show live English captions in the video"
          checked={settings.captions.enabled && !captionsImpossible}
          disabled={captionsImpossible}
          onChange={onCaptionsToggle}
        />
        {settings.captions.enabled && !captionsImpossible && (
          <>
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
        <p className="text-base leading-relaxed text-zinc-500 dark:text-zinc-400">
          {captionStatusText(captionModel)}
        </p>
      </Section>
    </aside>
  );
}
