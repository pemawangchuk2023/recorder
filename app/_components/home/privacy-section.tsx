import { HardDrive, ShieldCheck } from "lucide-react";
import { PRIVACY_POINTS } from "@/constants/home";

// Always dark, in both themes, so it stands out as the page's "promise".
export function PrivacySection() {
  return (
    <section className="px-4 sm:px-8">
      <div className="relative isolate mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] bg-zinc-950 px-6 py-16 text-white ring-1 ring-white/10 sm:px-14 sm:py-20">
        <div aria-hidden="true" className="absolute -top-32 -left-32 -z-10 size-96 rounded-full bg-red-600/30 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-32 -bottom-32 -z-10 size-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-5">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <ShieldCheck className="size-7 text-red-400" aria-hidden="true" />
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
              Your files never leave your computer.
            </h2>
            <p className="text-lg leading-relaxed text-zinc-400">
              Most online recorders and converters upload your files to their
              servers. This one can&apos;t — there&apos;s nowhere for them to go.
            </p>
          </div>
          <ul className="grid gap-4">
            {PRIVACY_POINTS.map((point) => (
              <li key={point.title} className="flex gap-4 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur">
                <HardDrive className="mt-0.5 size-6 shrink-0 text-red-400" aria-hidden="true" />
                <div>
                  <h3 className="text-lg font-semibold">{point.title}</h3>
                  <p className="text-base text-zinc-400">{point.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
