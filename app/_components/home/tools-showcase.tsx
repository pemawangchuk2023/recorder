import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { FeatureIcon } from "@/app/_components/feature-icon";
import { SectionHeading } from "@/app/_components/home/section-heading";
import { Button } from "@/components/ui/button";
import { TOOLS } from "@/constants/home";

export function ToolsShowcase() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-24 sm:px-8 sm:py-32">
        <SectionHeading
          eyebrow="Two tools, one tab"
          title="Record it. Convert it. Done."
          description="Use them together — record a demo, then export it as a GIF or MP3 — or on their own."
        />
        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {TOOLS.map((tool, index) => (
            <article
              key={tool.name}
              className="relative flex flex-col gap-6 overflow-hidden rounded-3xl border bg-card p-8 sm:p-10"
            >
              <div
                aria-hidden="true"
                className={`absolute -top-24 size-64 rounded-full blur-3xl ${index === 0 ? "-left-20 bg-brand/15" : "-right-20 bg-amber-500/15"}`}
              />
              <div className="flex items-center gap-4">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-background">
                  <FeatureIcon name={tool.icon} className="size-7" />
                </span>
                <div>
                  <h3 className="text-2xl font-semibold tracking-tight">{tool.name}</h3>
                  <p className="text-base text-muted-foreground">{tool.tagline}</p>
                </div>
              </div>
              <ul className="flex flex-col gap-3">
                {tool.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-base">
                    <Check className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
              <Button asChild variant={index === 0 ? "default" : "outline"} size="lg" className="mt-auto h-12 self-start rounded-full px-6 text-base">
                <Link href={tool.href}>
                  {tool.cta}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
