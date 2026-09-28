"use client";

import { FormatPicker } from "@/app/convert/_components/format-picker";
import { Hint, Section, Select, Toggle } from "@/app/convert/_components/form-controls";
import type { ConvertSettings } from "@/app/convert/_lib/types";
import {
  CHANNEL_OPTIONS,
  FRAME_RATE_OPTIONS,
  OUTPUT_FORMATS,
  QUALITY_OPTIONS,
  RESOLUTION_OPTIONS,
  ROTATION_OPTIONS,
  SAMPLE_RATE_OPTIONS,
  VOLUME_RANGE,
} from "@/constants/converter";

interface ConvertSettingsPanelProps {
  settings: ConvertSettings;
  onChange: (settings: ConvertSettings) => void;
  disabled: boolean;
}

// Lossless formats keep every detail, so there's no quality to pick.
const LOSSLESS = new Set(["wav", "flac"]);

export function ConvertSettingsPanel({ settings, onChange, disabled }: ConvertSettingsPanelProps) {
  const kind = OUTPUT_FORMATS[settings.format].kind;
  const hasPicture = kind !== "audio";
  const hasSound = kind !== "image" && !settings.removeAudio;
  const set = <K extends keyof ConvertSettings>(key: K, value: ConvertSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="flex flex-col gap-6">
      <Section title="Convert to" disabled={disabled}>
        <FormatPicker value={settings.format} onChange={(format) => set("format", format)} />
        {!LOSSLESS.has(settings.format) && (
          <Select
            label="Quality"
            value={settings.quality}
            options={QUALITY_OPTIONS}
            onChange={(quality) => set("quality", quality)}
          />
        )}
      </Section>

      {hasPicture && (
        <Section title="Picture" disabled={disabled}>
          <Select
            label="Size"
            value={settings.resolution}
            options={RESOLUTION_OPTIONS}
            onChange={(resolution) => set("resolution", resolution)}
          />
          <Select
            label="Frame rate"
            value={settings.frameRate}
            options={FRAME_RATE_OPTIONS}
            onChange={(frameRate) => set("frameRate", frameRate)}
          />
          {kind === "image" && (
            <Hint>
              &ldquo;Same as source&rdquo; makes a 480p GIF at 12 fps — GIFs get big fast.
            </Hint>
          )}
          <Select
            label="Rotate"
            value={settings.rotate}
            options={ROTATION_OPTIONS}
            onChange={(rotate) => set("rotate", rotate)}
          />
          <Toggle label="Mirror (flip sideways)" checked={settings.flip} onChange={(flip) => set("flip", flip)} />
          {kind === "video" && (
            <Toggle
              label="Remove sound"
              checked={settings.removeAudio}
              onChange={(removeAudio) => set("removeAudio", removeAudio)}
            />
          )}
        </Section>
      )}

      {hasSound && (
        <Section title="Sound" disabled={disabled}>
          <label className="flex flex-col gap-2 text-base text-zinc-700 dark:text-zinc-300">
            <span className="flex justify-between">
              Volume <span className="tabular-nums">{settings.volume}%</span>
            </span>
            <input
              type="range"
              min={VOLUME_RANGE.min}
              max={VOLUME_RANGE.max}
              step={VOLUME_RANGE.step}
              value={settings.volume}
              onChange={(event) => set("volume", Number(event.target.value))}
              className="accent-red-600"
            />
          </label>
          <Select
            label="Channels"
            value={settings.channels}
            options={CHANNEL_OPTIONS}
            onChange={(channels) => set("channels", channels)}
          />
          <Select
            label="Sample rate"
            value={settings.sampleRate}
            options={SAMPLE_RATE_OPTIONS}
            onChange={(sampleRate) => set("sampleRate", sampleRate)}
          />
        </Section>
      )}

      <Hint>
        When the format already matches and nothing is changed, the video is copied
        as-is: instant and without any loss in quality.
      </Hint>
    </div>
  );
}
