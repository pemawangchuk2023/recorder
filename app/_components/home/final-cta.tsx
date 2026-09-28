import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-8 sm:pb-32">
      <div className="relative isolate mx-auto flex w-full max-w-7xl flex-col items-center gap-8 overflow-hidden rounded-[2rem] border bg-linear-to-br from-brand/10 via-card to-amber-500/10 px-6 py-16 text-center sm:py-20">
        <div aria-hidden="true" className="absolute -top-24 left-1/2 -z-10 size-96 -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Ready when you are.
        </h2>
        <p className="max-w-xl text-lg text-muted-foreground">
          Open the recorder and hit Start — or drop a file into the converter.
          No sign-up, no waiting.
        </p>
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
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
      </div>
    </section>
  );
}
