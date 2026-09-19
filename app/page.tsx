import Link from "next/link";
import { FeatureIcon } from "@/app/_components/feature-icon";
import { ProductPreview } from "@/app/_components/product-preview";
import { FEATURES, STEPS } from "@/constants/home";
import { primaryButton, secondaryButton } from "@/lib/styles";

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
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white">
                  <FeatureIcon name={feature.icon} />
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
          {STEPS.map((step, index) => (
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
