import type { OutputFormatId } from "@/app/convert/_lib/types";
import { FORMAT_GROUPS, OUTPUT_FORMATS } from "@/constants/converter";

function choiceClass(selected: boolean): string {
  return `rounded-xl border px-3 py-2.5 text-base font-semibold transition-colors ${
    selected
      ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      : "border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
  }`;
}

export function FormatPicker({
  value,
  onChange,
}: {
  value: OutputFormatId;
  onChange: (format: OutputFormatId) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {FORMAT_GROUPS.map((group) => (
        <div key={group.kind} className="flex flex-col gap-2">
          <p className="text-sm font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
            {group.label}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {group.formats.map((format) => (
              <button
                key={format}
                type="button"
                aria-pressed={value === format}
                onClick={() => onChange(format)}
                className={choiceClass(value === format)}
              >
                {OUTPUT_FORMATS[format].label}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="text-base text-muted-foreground">{OUTPUT_FORMATS[value].description}</p>
    </div>
  );
}
