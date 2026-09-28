import Link from "next/link";
import { Logo } from "@/app/_components/logo";
import { MobileNav } from "@/app/_components/mobile-nav";
import { NavLinks } from "@/app/_components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/constants/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-tight sm:text-lg">
          <Logo />
          {SITE_NAME}
        </Link>
        <NavLinks className="hidden items-center gap-1 md:flex" />
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          <Button asChild className="hidden h-10 rounded-full px-5 text-base sm:inline-flex">
            <Link href="/recorder">
              <span className="size-2 rounded-full bg-primary-foreground" aria-hidden="true" />
              Start recording
            </Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
