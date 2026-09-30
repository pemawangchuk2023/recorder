import { Film } from "lucide-react";
import Link from "next/link";

export function EmptyLibrary() {
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed bg-card/50 px-6 py-20 text-center">
      <div className="grid size-16 place-items-center rounded-2xl bg-brand/10 text-brand">
        <Film className="size-8" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">No recordings yet</h2>
        <p className="max-w-md text-base text-muted-foreground">
          Everything you record is kept here automatically, in this browser only.
          Watch, rename, download or delete it whenever you like.
        </p>
      </div>
      <Link
        href="/recorder"
        className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-sm shadow-red-600/30 hover:bg-red-500"
      >
        <span className="size-3 rounded-full bg-white" aria-hidden="true" />
        Record your first video
      </Link>
    </div>
  );
}
