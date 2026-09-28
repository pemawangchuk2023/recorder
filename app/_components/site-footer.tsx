import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/app/_components/logo";
import { FOOTER_GROUPS, SITE_NAME } from "@/constants/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/30">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex max-w-sm flex-col gap-4">
          <Link href="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <Logo />
            {SITE_NAME}
          </Link>
          <p className="text-base leading-relaxed text-muted-foreground">
            Record your screen and convert video and audio — free, with no
            account, right in your browser.
          </p>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
            Runs entirely on your computer. Nothing is uploaded.
          </p>
        </div>
        {FOOTER_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">{group.title}</h2>
            <ul className="flex flex-col gap-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-base text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <p className="mx-auto w-full max-w-7xl px-4 py-6 text-sm text-muted-foreground sm:px-8">
          © {new Date().getFullYear()} {SITE_NAME}. Made to keep your recordings private.
        </p>
      </div>
    </footer>
  );
}
