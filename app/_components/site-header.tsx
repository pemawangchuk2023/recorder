import Link from "next/link";
import { Logo } from "@/app/_components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-base font-semibold tracking-tight sm:text-lg">
          <Logo />
          Screen Recorder
        </Link>
        <nav className="flex items-center gap-5 text-base font-medium sm:gap-8 text-zinc-600 dark:text-zinc-400">
          <Link href="/" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
            Home
          </Link>
          <Link href="/recorder" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
            Recorder
          </Link>
        </nav>
      </div>
    </header>
  );
}
