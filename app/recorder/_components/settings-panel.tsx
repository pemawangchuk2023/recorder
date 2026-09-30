"use client";

import { Captions, Gauge, Mic, Video, Volume2, Clapperboard } from "lucide-react";
import { CameraFramingControls } from "@/app/recorder/_components/camera-framing-controls";
import { MicLevelMeter } from "@/app/recorder/_components/mic-level-meter";
import { ModePicker } from "@/app/recorder/_components/mode-picker";
import {
  ChoiceGroup,
  DeviceSelect,
  Field,
  Hint,
  Section,
  Slider,
  Switch,
  control,
} from "@/app/recorder/_components/settings-controls";
import type { CaptionModel } from "@/app/recorder/_hooks/use-caption-model";
import type { MediaDevice } from "@/app/recorder/_hooks/use-devices";
import { CORNER_POSITIONS, cornerOf } from "@/app/recorder/_lib/bubble-geometry";
import { modeOf } from "@/app/recorder/_lib/recording-mode";
import type {
  RecorderSettings,
  RecordingMode,
  Resolution,
  ScreenCameraLayout,
} from "@/app/recorder/_lib/types";
import {
  BUBBLE_CORNERS,
  BUBBLE_SHAPES,
  BUBBLE_SIZE_PRESETS,
  BUBBLE_SIZE_RANGE,
  COUNTDOWN_OPTIONS,
  FRAME_RATE_OPTIONS,
  LAYOUT_DESCRIPTIONS,
  LAYOUT_OPTIONS,
  SCREEN_FIT_DESCRIPTIONS,
  SCREEN_FIT_OPTIONS,
  STACKED_SPLIT_RANGE,
  MIC_MODES,
  RESOLUTION_OPTIONS,
  VIDEO_CODECS,
  VIDEO_QUALITIES,
} from "@/constants/recorder";

interface SettingsPanelProps {
  settings: RecorderSettings;
  onChange: (settings: RecorderSettings) => void;
  disabled: boolean;
  screenSupported: boolean;
  onModeChange: (mode: RecordingMode) => void;
  onLayoutChange: (layout: ScreenCameraLayout) => void;
  cameras: MediaDevice[];
  cameraError: string | null;
  floatingBubble: { supported: boolean; isOpen: boolean; open: () => void; close: () => void };
  microphones: MediaDevice[];
  micLevel: number;
  onMicToggle: (enabled: boolean) => void;
  onDeviceListOpen: () => void;
  captionModel: CaptionModel;
  onCaptionsToggle: (enabled: boolean) => void;
  // Codecs this computer can record; a choice is shown when there's more than one.
  codecs: RecorderSettings["codec"][];
}

const MIC_MODE_OPTIONS = (Object.keys(MIC_MODES) as (keyof typeof MIC_MODES)[]).map((mode) => ({
  value: mode,
  label: MIC_MODES[mode].label,
}));

const QUALITY_OPTIONS = (Object.keys(VIDEO_QUALITIES) as (keyof typeof VIDEO_QUALITIES)[]).map(
  (quality) => ({ value: quality, label: VIDEO_QUALITIES[quality].label })
);

// Above 1080p, only screens with that many pixels gain anything.
const HIGH_RESOLUTIONS: Resolution[] = ["1440p", "2160p"];

const darkButton =
  "self-start rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200";

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
  onModeChange,
  onLayoutChange,
  cameras,
  cameraError,
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
  const updateCamera = (patch: Partial<RecorderSettings["camera"]>) =>
    update({ camera: { ...settings.camera, ...patch } });
  const mode = modeOf(settings);
  const recordsScreen = settings.source === "screen";
  const stacked = mode === "screen-camera" && settings.layout === "stacked";
  const updateStacked = (patch: Partial<RecorderSettings["stacked"]>) =>
    update({ stacked: { ...settings.stacked, ...patch } });
  const captionsImpossible =
    captionModel.status === "unsupported" || captionModel.status === "unavailable";

  return (
    <aside className="flex flex-col gap-4">
      <Section title="Record" icon={Clapperboard} disabled={disabled}>
        <ModePicker value={mode} screenSupported={screenSupported} onChange={onModeChange} />
        {!screenSupported && <Hint>Screen recording needs Chrome or Edge on a computer.</Hint>}
        {mode === "screen-camera" && (
          <>
            <ChoiceGroup
              label="Layout"
              value={settings.layout}
              options={LAYOUT_OPTIONS}
              onChange={onLayoutChange}
            />
            <Hint>{LAYOUT_DESCRIPTIONS[settings.layout]}</Hint>
          </>
        )}
        {stacked && (
          <>
            <Field label={`Screen height · ${Math.round(settings.stacked.split * 100)}% (you get the rest)`}>
              <input
                type="range"
                min={STACKED_SPLIT_RANGE.min}
                max={STACKED_SPLIT_RANGE.max}
                step={0.01}
                value={settings.stacked.split}
                onChange={(event) => updateStacked({ split: Number(event.target.value) })}
                className="accent-red-600"
              />
            </Field>
            <ChoiceGroup
              label="Screen"
              value={settings.stacked.screenFit}
              options={SCREEN_FIT_OPTIONS}
              onChange={(screenFit) => updateStacked({ screenFit })}
            />
            <Hint>{SCREEN_FIT_DESCRIPTIONS[settings.stacked.screenFit]}</Hint>
          </>
        )}
        <ChoiceGroup
          label="Countdown"
          value={settings.countdown}
          options={COUNTDOWN_OPTIONS}
          onChange={(countdown) => update({ countdown })}
        />
      </Section>

      {settings.camera.enabled && (
        <Section title="Camera" icon={Video} disabled={disabled}>
          <DeviceSelect
            label="Camera"
            devices={cameras}
            value={settings.camera.deviceId}
            onOpen={onDeviceListOpen}
            onChange={(deviceId) => updateCamera({ deviceId })}
          />
          {cameraError && <Hint tone="warning">{cameraError}</Hint>}

          {recordsScreen && !stacked && floatingBubble.supported && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={floatingBubble.isOpen ? floatingBubble.close : floatingBubble.open}
                className={darkButton}
              >
                {floatingBubble.isOpen ? "Hide floating bubble" : "Show floating bubble"}
              </button>
              <Hint>Floats over every app so you can see yourself. Drag it anywhere.</Hint>
            </div>
          )}

          <Switch
            label="Mirror camera"
            description="Flip left and right, like looking in a mirror."
            checked={settings.camera.mirror}
            onChange={(mirror) => updateCamera({ mirror })}
          />

          {recordsScreen && (
            <CameraFramingControls
              framing={settings.camera.framing}
              onChange={(framing) => updateCamera({ framing })}
            />
          )}

          {recordsScreen && !stacked && (
            <>
              <ChoiceGroup
                label="Bubble shape"
                value={settings.camera.shape}
                options={BUBBLE_SHAPES}
                onChange={(shape) => updateCamera({ shape })}
              />
              <ChoiceGroup
                label="Bubble size"
                value={BUBBLE_SIZE_PRESETS.find((preset) => preset.value === settings.camera.size)?.value ?? null}
                options={BUBBLE_SIZE_PRESETS}
                onChange={(size) => updateCamera({ size })}
              />
              <Field label={`Size · ${Math.round(settings.camera.size * 100)}% of the video height`}>
                <input
                  type="range"
                  min={BUBBLE_SIZE_RANGE.min}
                  max={BUBBLE_SIZE_RANGE.max}
                  step={0.01}
                  value={settings.camera.size}
                  onChange={(event) => updateCamera({ size: Number(event.target.value) })}
                  className="accent-red-600"
                />
              </Field>
              <Hint>Or drag the white dot on the bubble&apos;s edge in the preview.</Hint>
              <ChoiceGroup
                label="Bubble position"
                value={cornerOf(settings.camera.position)}
                options={BUBBLE_CORNERS}
                columns={2}
                onChange={(corner) => updateCamera({ position: CORNER_POSITIONS[corner] })}
              />
              <Hint>
                Or drag the bubble in the preview — before or during recording — to
                keep it off your slides&apos; text. Sharing a whole screen records the
                floating bubble wherever you drag it on screen.
              </Hint>
            </>
          )}
        </Section>
      )}

      <Section title="Microphone" icon={Mic} disabled={disabled}>
        <Switch label="Include microphone" checked={settings.mic.enabled} onChange={onMicToggle} />
        {settings.mic.enabled && (
          <>
            <DeviceSelect
              label="Input device"
              devices={microphones}
              value={settings.mic.deviceId}
              onOpen={onDeviceListOpen}
              onChange={(deviceId) => update({ mic: { ...settings.mic, deviceId } })}
            />
            <ChoiceGroup
              label="Sound"
              value={settings.mic.mode}
              options={MIC_MODE_OPTIONS}
              onChange={(micMode) => update({ mic: { ...settings.mic, mode: micMode } })}
            />
            <Hint>{MIC_MODES[settings.mic.mode].description}</Hint>
            <Slider
              label="Microphone volume"
              value={settings.mic.gain}
              onChange={(gain) => update({ mic: { ...settings.mic, gain } })}
            />
            <MicLevelMeter level={micLevel} />
          </>
        )}
      </Section>

      {recordsScreen && (
        <Section title="Computer sound" icon={Volume2} disabled={disabled}>
          <Switch
            label="Record computer sound"
            checked={settings.systemAudio.enabled}
            onChange={(enabled) => update({ systemAudio: { ...settings.systemAudio, enabled } })}
          />
          {settings.systemAudio.enabled ? (
            <>
              <Slider
                label="Volume"
                value={settings.systemAudio.gain}
                onChange={(gain) => update({ systemAudio: { ...settings.systemAudio, gain } })}
              />
              <Hint>
                When you press Start, Chrome opens on its list of tabs: pick the tab
                playing the sound and keep “Also share tab audio” on. Sharing your
                whole screen includes sound only if Chrome offers “Also share system
                audio”. Talking too? Wear headphones, so the microphone doesn&apos;t
                pick up the speakers a second time.
              </Hint>
            </>
          ) : (
            <Hint>
              Off: only your voice is recorded. Turn on to include music, videos or
              anything else playing on your computer — recorded directly, so it
              sounds exactly like the original.
            </Hint>
          )}
        </Section>
      )}

      <Section title="Captions" icon={Captions} disabled={disabled}>
        <Switch
          label="Live English captions"
          description="Plus a transcript you can search and download."
          checked={settings.captions.enabled && !captionsImpossible}
          disabled={captionsImpossible}
          onChange={onCaptionsToggle}
        />
        {settings.captions.enabled && !captionsImpossible && (
          <>
            <Switch
              label="Show captions inside the video"
              checked={settings.captions.burnIn}
              onChange={(burnIn) => update({ captions: { ...settings.captions, burnIn } })}
            />
            {(captionModel.status === "downloadable" || captionModel.installFailed) && (
              <button type="button" onClick={captionModel.install} className={darkButton}>
                Set up English captions
              </button>
            )}
            {!settings.mic.enabled && (
              <Hint tone="warning">Turn on the microphone — captions come from your voice.</Hint>
            )}
          </>
        )}
        <Hint>{captionStatusText(captionModel)}</Hint>
      </Section>

      <Section title="Quality" icon={Gauge} disabled={disabled}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Resolution">
            <select
              className={control}
              value={settings.resolution}
              onChange={(event) => update({ resolution: event.target.value as Resolution })}
            >
              {RESOLUTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Frame rate">
            <select
              className={control}
              value={settings.frameRate}
              onChange={(event) =>
                update({ frameRate: Number(event.target.value) as RecorderSettings["frameRate"] })
              }
            >
              {FRAME_RATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {HIGH_RESOLUTIONS.includes(settings.resolution) && (
          <Hint>
            Sharper only on screens with at least this many pixels — recordings are
            never upscaled, so a smaller screen records at its own size.
          </Hint>
        )}
        <ChoiceGroup
          label="Detail"
          value={settings.quality}
          options={QUALITY_OPTIONS}
          onChange={(quality) => update({ quality })}
        />
        <Hint>{VIDEO_QUALITIES[settings.quality].description}</Hint>
        {codecs.length > 1 && (
          <>
            <ChoiceGroup
              label="Video format"
              value={settings.codec}
              options={codecs.map((codec) => ({ value: codec, label: VIDEO_CODECS[codec].label }))}
              onChange={(codec) => update({ codec })}
            />
            <Hint>{VIDEO_CODECS[settings.codec].description}</Hint>
          </>
        )}
      </Section>
    </aside>
  );
}
