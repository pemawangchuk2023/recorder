import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const BARS = 12;

// A compact segmented meter showing how loud the microphone is right now.
export function MicLevelMeter({ level, className }: { level: number; className?: string }) {
  const lit = Math.round(Math.min(1, level) * BARS);
  return (
    <div className={cn("flex items-center gap-2", className)} aria-hidden="true">
      <Mic className="size-4 text-muted-foreground" />
      <div className="flex h-4 items-end gap-0.5">
        {Array.from({ length: BARS }, (_, index) => (
          <span
            key={index}
            className={cn(
              "w-1 rounded-full transition-colors duration-75",
              index < lit
                ? index >= BARS - 2
                  ? "bg-red-500"
                  : index >= BARS - 4
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                : "bg-muted-foreground/20"
            )}
            style={{ height: `${40 + (index / BARS) * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}
