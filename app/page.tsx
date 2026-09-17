import Link from "next/link";
import type { ReactNode } from "react";

const primaryButton =
  "inline-flex items-center justify-center gap-2.5 rounded-full bg-red-600 px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600";
const secondaryButton =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 text-base font-semibold text-zinc-900 ring-1 ring-zinc-300 transition-colors hover:bg-zinc-100 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:bg-zinc-900";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const features: { title: string; description: string; icon: ReactNode }[] = [
  {
    title: "Sharp 1080p MP4",
    description:
      "Recorded at YouTube's recommended bitrates and saved as MP4 instantly — no converting, no waiting.",
    icon: (
      <Icon>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </Icon>
    ),
  },
  {
    title: "Your voice, clearly",
    description:
      "Noise suppression and echo cancellation on your mic, mixed with tab audio at separate volumes.",
    icon: (
      <Icon>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </Icon>
    ),
  },
  {
    title: "Webcam bubble",
    description:
      "A round camera bubble in any corner, in three sizes — it keeps recording when you switch apps.",
    icon: (
      <Icon>
        <rect x="3" y="6" width="13" height="12" rx="2" />
        <path d="m16 10 5-3v10l-5-3" />
      </Icon>
    ),
  },
  {
    title: "Live captions",
    description:
      "English captions appear inside the video as you speak, transcribed on your own computer.",
    icon: (
      <Icon>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 11h10M7 15h4M13 15h4" />
      </Icon>
    ),
  },
  {
    title: "Private by design",
    description:
      "No account, no uploads, no tracking. Your recording is saved straight to your computer.",
    icon: (
      <Icon>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </Icon>
    ),
  },
  {
    title: "Made for flow",
    description:
      "A 3-second countdown, pause and resume, and keyboard shortcuts to stay out of your way.",
    icon: (
      <Icon>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
      </Icon>
    ),
  },
];

const steps = [
  {
    title: "Pick your setup",
    description: "Choose quality, microphone, webcam bubble and captions.",
  },
  {
    title: "Share and talk",
    description:
      "Select a screen, window or tab. A short countdown gives you a moment to get ready.",
  },
  {
    title: "Save your MP4",
    description: "Stop when you're done, watch it back, and save the file to your computer.",
  },
];

function ProductPreview() {
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

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid w-full max-w-7xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-7">
          <p className="rounded-full bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-950 dark:text-red-300 dark:ring-red-900">
            No account · No uploads · No install
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Record your screen. Keep it on your computer.
          </h1>
          <p className="max-w-xl text-xl leading-relaxed text-pretty text-zinc-600 dark:text-zinc-400">
            Capture your screen, voice and webcam as a sharp MP4 with live
            English captions — right in your browser. Nothing is ever uploaded.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/recorder" className={primaryButton}>
              <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
              Start recording
            </Link>
            <a href="#how-it-works" className={secondaryButton}>
              How it works
            </a>
          </div>
          <p className="text-base text-zinc-500 dark:text-zinc-400">
            Works in Chrome and Edge on desktop.
          </p>
        </div>
        <ProductPreview />
      </section>

      <section className="border-y border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a good screen recording needs
          </h2>
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <li
                key={feature.title}
                className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white">
                  {feature.icon}
                </span>
                <h3 className="text-xl font-semibold">{feature.title}</h3>
                <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto w-full max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
        <ol className="mt-12 grid gap-10 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-lg font-semibold text-white dark:bg-white dark:text-zinc-900">
                {index + 1}
              </span>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-20 flex flex-col items-start justify-between gap-8 rounded-3xl bg-zinc-900 p-10 text-white sm:flex-row sm:items-center sm:p-14 dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready when you are</h2>
            <p className="mt-3 text-lg text-zinc-400">
              Open the recorder — your first recording takes less than a minute.
            </p>
          </div>
          <Link href="/recorder" className={primaryButton}>
            <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
            Start recording
          </Link>
        </div>
      </section>
    </>
  );
}
