import type { ReactNode } from "react";

// The title block at the top of the tool pages, matching the home page style.
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative isolate mb-10 flex flex-col gap-3">
      <div aria-hidden="true" className="absolute -top-24 -left-24 -z-10 size-72 rounded-full bg-brand/10 blur-3xl" />
      <p className="text-sm font-semibold tracking-widest text-brand uppercase">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
      <p className="max-w-3xl text-lg leading-relaxed text-pretty text-muted-foreground">{children}</p>
    </div>
  );
}
