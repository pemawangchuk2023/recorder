// A drawing of the recorder in action — decorative, so it's hidden from
// screen readers.
export function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 shadow-zinc-900/10 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10"
    >
      <div className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
      </div>
      <div className="relative aspect-video bg-linear-to-br from-zinc-100 to-zinc-200 p-6 dark:from-zinc-800 dark:to-zinc-900">
        <div className="flex h-full flex-col gap-3 pt-8">
          <div className="h-3 w-2/5 rounded-full bg-zinc-400/60 dark:bg-zinc-600" />
          <div className="h-2 w-3/5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="h-2 w-1/2 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <div className="mt-2 grid w-3/5 grid-cols-3 gap-2">
            <div className="h-10 rounded-lg bg-white/80 dark:bg-zinc-700/60" />
            <div className="h-10 rounded-lg bg-white/80 dark:bg-zinc-700/60" />
            <div className="h-10 rounded-lg bg-white/80 dark:bg-zinc-700/60" />
          </div>
        </div>

        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-white sm:text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          REC 02:14
        </div>

        <div className="absolute bottom-5 left-4 right-24 flex justify-center sm:right-32">
          <p className="rounded-md bg-black/75 px-3 py-1.5 text-center text-xs font-semibold text-white sm:text-sm">
            …and everything stays on your computer.
          </p>
        </div>

        <div className="absolute bottom-4 right-4 h-16 w-16 overflow-hidden rounded-full bg-linear-to-br from-amber-200 to-rose-300 shadow-lg ring-2 ring-white sm:h-24 sm:w-24">
          <div className="mx-auto mt-3 h-6 w-6 rounded-full bg-rose-900/40 sm:mt-5 sm:h-8 sm:w-8" />
          <div className="mx-auto mt-1 h-10 w-12 rounded-t-full bg-rose-900/40 sm:w-16" />
        </div>
      </div>
    </div>
  );
}
