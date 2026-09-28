import type { ReactNode } from "react";

export const smallButton =
  "rounded-full px-4 py-2 text-base font-medium ring-1 ring-zinc-300 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-zinc-700 dark:hover:bg-zinc-800";

export const primaryAction =
  "rounded-full bg-red-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50";

const control =
  "w-full rounded-xl border border-input bg-background px-3 py-2.5 text-base";

export function Section({
  title,
  disabled,
  children,
}: {
  title: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset
      disabled={disabled}
      className="flex flex-col gap-4 rounded-3xl border bg-card p-6 disabled:opacity-60"
    >
      <legend className="px-1.5 text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="text-base leading-relaxed text-muted-foreground">{children}</p>;
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-base text-zinc-700 dark:text-zinc-300">
      {label}
      <select
        className={control}
        value={String(value)}
        onChange={(event) => {
          const picked = options.find((option) => String(option.value) === event.target.value);
          if (picked) {
            onChange(picked.value);
          }
        }}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 text-base font-medium text-zinc-800 dark:text-zinc-200">
      {label}
      <input
        type="checkbox"
        className="h-5 w-5 shrink-0 accent-red-600"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
    >
      <div
        className="h-full rounded-full bg-red-600 transition-[width]"
        style={{ width: `${Math.round(value * 100)}%` }}
      />
    </div>
  );
}
