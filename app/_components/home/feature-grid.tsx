import { FeatureIcon } from "@/app/_components/feature-icon";
import { SectionHeading } from "@/app/_components/home/section-heading";
import { FEATURES } from "@/constants/home";
import { cn } from "@/lib/utils";

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-24 sm:px-8 sm:py-32">
      <SectionHeading
        eyebrow="Features"
        title="Everything a good recording needs"
        description="Studio-quality results from a single browser tab — with the privacy of an app that never phones home."
      />
      <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((feature) => (
          <li
            key={feature.title}
            className={cn(
              "group relative flex flex-col gap-4 overflow-hidden rounded-3xl border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5",
              feature.wide && "lg:col-span-2"
            )}
          >
            <div
              aria-hidden="true"
              className="absolute -top-16 -right-16 size-40 rounded-full bg-brand/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
            />
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
              <FeatureIcon name={feature.icon} />
            </span>
            <h3 className="text-xl font-semibold tracking-tight">{feature.title}</h3>
            <p className="text-base leading-relaxed text-muted-foreground">{feature.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
