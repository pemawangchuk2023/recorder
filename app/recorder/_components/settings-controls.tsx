"use client";

import type { LucideIcon } from "lucide-react";
import { useId, type ReactNode } from "react";
import type { MediaDevice } from "@/app/recorder/_hooks/use-devices";
import { cn } from "@/lib/utils";

// Form pieces shared by the recorder's settings sections.

export const control =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-2 focus-visible:outline-ring";

export function Hint({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "warning" }) {
  return (
    <p
      className={cn(
        "text-sm leading-relaxed",
        tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
      )}
    >
      {children}
    </p>
  );
}

export function Section({
  title,
  icon: Icon,
  disabled,
  children,
}: {
  title: string;
  icon: LucideIcon;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4 rounded-3xl border bg-card p-5 disabled:opacity-60">
      <legend className="float-left flex w-full items-center gap-2.5 text-base font-semibold">
        <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-foreground/80">
      {label}
      {children}
    </label>
  );
}

export function Switch({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="flex flex-col gap-0.5 text-base font-medium">
        {label}
        {description && <span className="text-sm font-normal text-muted-foreground">{description}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          checked ? "bg-red-600" : "bg-zinc-300 dark:bg-zinc-700"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}

// A row of mutually exclusive buttons, like a segmented control.
export function ChoiceGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  columns,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-foreground/80">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="grid gap-1 rounded-xl bg-muted p-1"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={value === option.value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg px-2 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              value === option.value
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Slider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={`${label} · ${Math.round(value * 100)}%`}>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        className="accent-red-600"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

export function DeviceSelect({
  label,
  devices,
  value,
  onOpen,
  onChange,
}: {
  label: string;
  devices: MediaDevice[];
  value: string | undefined;
  onOpen: () => void;
  onChange: (deviceId: string | undefined) => void;
}) {
  return (
    <Field label={label}>
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
    </Field>
  );
}
