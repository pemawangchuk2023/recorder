"use client";

import { useId } from "react";
import type { CameraFraming } from "@/app/recorder/_lib/types";
import { DEFAULT_FRAMING, MAX_CAMERA_ZOOM } from "@/constants/recorder";

function Range({
  label,
  valueText,
  min,
  max,
  step,
  value,
  disabled,
  onChange,
}: {
  label: string;
  valueText: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm font-medium text-foreground/80">
        <label htmlFor={id}>{label}</label>
        <span className="tabular-nums text-muted-foreground">{valueText}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={valueText}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-red-600 disabled:opacity-40"
      />
    </div>
  );
}

function sideText(value: number, low: string, high: string): string {
  if (Math.abs(value - 0.5) < 0.02) {
    return "Centre";
  }
  return `${Math.round(Math.abs(value - 0.5) * 200)}% ${value < 0.5 ? low : high}`;
}

// Chooses which part of the camera fills the bubble, so your whole face
// fits even if you sit off-centre. The preview bubble updates live.
export function CameraFramingControls({
  framing,
  onChange,
}: {
  framing: CameraFraming;
  onChange: (framing: CameraFraming) => void;
}) {
  const isDefault =
    framing.zoom === DEFAULT_FRAMING.zoom &&
    framing.x === DEFAULT_FRAMING.x &&
    framing.y === DEFAULT_FRAMING.y;
  const canMoveVertically = framing.zoom > 1;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-muted/50 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Framing</span>
        <button
          type="button"
          onClick={() => onChange(DEFAULT_FRAMING)}
          disabled={isDefault}
          className="text-sm font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:no-underline disabled:opacity-40"
        >
          Reset
        </button>
      </div>
      <Range
        label="Zoom"
        valueText={framing.zoom === 1 ? "Whole picture" : `${framing.zoom.toFixed(1)}×`}
        min={1}
        max={MAX_CAMERA_ZOOM}
        step={0.05}
        value={framing.zoom}
        onChange={(zoom) => onChange({ ...framing, zoom })}
      />
      <Range
        label="Left – right"
        valueText={sideText(framing.x, "left", "right")}
        min={0}
        max={1}
        step={0.01}
        value={framing.x}
        onChange={(x) => onChange({ ...framing, x })}
      />
      <Range
        label="Up – down"
        valueText={canMoveVertically ? sideText(framing.y, "up", "down") : "Zoom in to adjust"}
        min={0}
        max={1}
        step={0.01}
        value={framing.y}
        disabled={!canMoveVertically}
        onChange={(y) => onChange({ ...framing, y })}
      />
      <p className="text-sm leading-relaxed text-muted-foreground">
        Your camera is cropped to fit its space, so the sides are cut off.
        Slide left or right until your face is in the middle.
      </p>
    </div>
  );
}
