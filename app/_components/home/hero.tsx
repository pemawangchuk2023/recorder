import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ProductPreview } from "@/app/_components/home/product-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HERO } from "@/constants/home";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Faint grid that fades out towards the edges, plus a soft brand glow. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-size-[3.5rem_3.5rem] mask-[radial-gradient(ellipse_70%_60%_at_50%_0%,black_40%,transparent_100%)]"
      />
      <div aria-hidden="true" className="absolute -top-40 left-1/2 -z-10 h-120 w-3xl -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />

      <div className="mx-auto grid w-full max-w-7xl items-center gap-16 px-4 pt-16 pb-24 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-28 lg:pb-32">
        <div className="flex flex-col items-start gap-7 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
          <Badge variant="outline" className="h-auto gap-2 rounded-full border-brand/30 bg-brand/10 px-4 py-1.5 text-sm font-semibold text-brand">
            <span className="size-1.5 rounded-full bg-brand" />
            {HERO.badge}
          </Badge>
          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
            {HERO.titleStart}{" "}
            <span className="bg-linear-to-r from-brand via-orange-500 to-amber-500 bg-clip-text text-transparent">
              {HERO.titleHighlight}
            </span>{" "}
            {HERO.titleEnd}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
            {HERO.description}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="h-12 rounded-full px-7 text-base shadow-lg shadow-brand/25">
              <Link href="/recorder">
                <span className="size-2.5 rounded-full bg-primary-foreground" aria-hidden="true" />
                Start recording
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-7 text-base">
              <Link href="/convert">
                Convert a file
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {HERO.trust.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-500" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-1000">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
