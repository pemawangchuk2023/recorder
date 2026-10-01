"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

// One click switches between light and dark.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      onClick={() => setTheme(next)}
      // The label is only known after hydration; until then the button still works.
      aria-label={`Switch to ${next} mode`}
      suppressHydrationWarning
    >
      {/* Both icons render; CSS shows the right one, so nothing shifts before the theme is known. */}
      <Sun className="size-5 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
      <Moon className="absolute size-5 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
    </Button>
  );
}
