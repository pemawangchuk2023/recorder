import { STATS } from "@/constants/home";
import { OUTPUT_FORMATS } from "@/constants/converter";

const FORMAT_LABELS = Object.values(OUTPUT_FORMATS).map((format) => format.label);

// Headline numbers, then every export format scrolling past.
export function StatsStrip() {
  return (
    <section className="border-y bg-muted/30">
      <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-px px-4 py-10 sm:px-8 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-1 py-2 text-center">
            <dt className="order-2 text-sm text-muted-foreground">{stat.label}</dt>
            <dd className="order-1 text-3xl font-semibold tracking-tight sm:text-4xl">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <div
        aria-label={`Export formats: ${FORMAT_LABELS.join(", ")}`}
        className="relative overflow-hidden border-t py-5 mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
      >
        {/* Two copies side by side, so shifting by half loops seamlessly. */}
        <div aria-hidden="true" className="flex w-max gap-4 motion-safe:animate-marquee">
          {[...FORMAT_LABELS, ...FORMAT_LABELS].map((label, index) => (
            <span
              key={index}
              className="rounded-full border bg-background px-5 py-2 text-sm font-semibold tracking-wide text-muted-foreground"
            >
              .{label.toLowerCase()}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
