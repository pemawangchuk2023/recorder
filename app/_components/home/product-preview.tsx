import { Check, Music } from "lucide-react";

const BARS = [0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8, 0.55, 0.95, 0.65, 0.45, 0.85];

// A drawing of the recorder in action — decorative, so it's hidden from
// screen readers.
export function ProductPreview() {
  return (
    <div aria-hidden="true" className="relative">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-brand/20 blur-3xl" />

      <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-black/10 dark:shadow-black/40">
        <div className="flex items-center gap-3 border-b bg-muted/50 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="mx-auto hidden h-6 w-1/2 items-center justify-center rounded-md bg-background/80 text-xs text-muted-foreground sm:flex">
            your-demo.app
          </div>
        </div>

        <div className="relative aspect-video bg-linear-to-br from-muted to-background p-5 sm:p-7">
          <div className="flex h-full flex-col gap-3 pt-8 sm:pt-10">
            <div className="h-3 w-2/5 rounded-full bg-foreground/25" />
            <div className="h-2 w-3/5 rounded-full bg-foreground/10" />
            <div className="h-2 w-1/2 rounded-full bg-foreground/10" />
            <div className="mt-2 grid w-3/5 grid-cols-3 gap-2">
              <div className="h-10 rounded-lg bg-background/80 shadow-sm sm:h-14" />
              <div className="h-10 rounded-lg bg-brand/15 shadow-sm sm:h-14" />
              <div className="h-10 rounded-lg bg-background/80 shadow-sm sm:h-14" />
            </div>
          </div>

          <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white tabular-nums sm:text-sm">
            <span className="size-2 rounded-full bg-red-500 motion-safe:animate-pulse" />
            REC 02:14
          </div>

          <div className="absolute top-4 right-4 flex h-6 items-end gap-0.5 rounded-full bg-black/75 px-2.5 py-1.5 sm:h-7">
            {BARS.map((height, index) => (
              <span
                key={index}
                className="w-0.5 origin-bottom rounded-full bg-emerald-400 motion-safe:animate-equalizer"
                style={{ height: `${height * 100}%`, animationDelay: `${index * -0.13}s` }}
              />
            ))}
          </div>

          <div className="absolute right-24 bottom-5 left-4 flex justify-center sm:right-32">
            <p className="rounded-md bg-black/75 px-3 py-1.5 text-center text-xs font-semibold text-white sm:text-sm">
              …and everything stays on your computer.
            </p>
          </div>

          <div className="absolute right-4 bottom-4 size-16 overflow-hidden rounded-full bg-linear-to-br from-amber-200 to-rose-300 shadow-lg ring-2 ring-white sm:size-24">
            <div className="mx-auto mt-3 size-6 rounded-full bg-rose-900/40 sm:mt-5 sm:size-8" />
            <div className="mx-auto mt-1 h-10 w-12 rounded-t-full bg-rose-900/40 sm:w-16" />
          </div>
        </div>
      </div>

      <div className="absolute -bottom-12 -left-3 hidden items-center gap-3 rounded-2xl border bg-card/90 px-4 py-3 shadow-xl backdrop-blur motion-safe:animate-float sm:flex lg:-left-10">
        <span className="flex size-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          <Check className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Saved demo.mp4</p>
          <p className="text-xs text-muted-foreground">12.4 MB · 1080p · H.264</p>
        </div>
      </div>

      <div className="absolute -top-5 -right-3 hidden items-center gap-3 rounded-2xl border bg-card/90 px-4 py-3 shadow-xl backdrop-blur motion-safe:animate-float [animation-delay:-3s] sm:flex lg:-right-8">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Music className="size-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Converted to MP3</p>
          <p className="text-xs text-muted-foreground">3.1 MB · in 2 seconds</p>
        </div>
      </div>
    </div>
  );
}
