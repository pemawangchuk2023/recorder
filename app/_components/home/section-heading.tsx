import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-4", align === "center" && "mx-auto items-center text-center")}>
      <p className="text-sm font-semibold tracking-widest text-brand uppercase">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">{title}</h2>
      {description && (
        <p className="text-lg leading-relaxed text-pretty text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
