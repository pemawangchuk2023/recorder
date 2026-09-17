import Link from "next/link";
import { Logo } from "@/app/_components/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200/80 bg-zinc-50/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <Logo />
          Screen Recorder
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
