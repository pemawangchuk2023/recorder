import { SectionHeading } from "@/app/_components/home/section-heading";
import { STEPS } from "@/constants/home";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading eyebrow="How it works" title="Your first recording in under a minute" />
      <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
        {/* The line joining the steps on wide screens. */}
        <div aria-hidden="true" className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-transparent via-border to-transparent md:block" />
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative flex flex-col items-center gap-4 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border bg-card text-xl font-semibold shadow-sm">
              <span className="bg-linear-to-br from-brand to-amber-500 bg-clip-text text-transparent">{index + 1}</span>
            </span>
            <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
            <p className="max-w-xs text-base leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
