import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { CheckLevel, CompatibilityCheck } from "@/lib/youtube/compatibility";
import { cn } from "@/lib/utils";

const ICONS: Record<CheckLevel, typeof CheckCircle2> = {
  pass: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
};

const TONES: Record<CheckLevel, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  info: "text-sky-600 dark:text-sky-400",
};

export function CompatibilityList({ checks }: { checks: CompatibilityCheck[] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {checks.map((check) => {
        const Icon = ICONS[check.level];
        return (
          <li key={check.label} className="flex gap-2.5 rounded-xl bg-muted/60 p-3">
            <Icon className={cn("mt-0.5 size-4 shrink-0", TONES[check.level])} aria-hidden="true" />
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="font-semibold">{check.label}</span>
              <span className="leading-snug text-muted-foreground">{check.detail}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
