"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/app/_components/logo";
import { NavLinks } from "@/app/_components/nav-links";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SITE_NAME } from "@/constants/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="md:hidden" aria-label="Open menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3 text-lg">
            <Logo />
            {SITE_NAME}
          </SheetTitle>
        </SheetHeader>
        <NavLinks className="flex flex-col gap-1 px-4" onNavigate={close} />
        <div className="mt-auto p-4">
          <Button asChild size="lg" className="h-11 w-full rounded-full text-base">
            <Link href="/recorder" onClick={close}>
              Start recording
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
