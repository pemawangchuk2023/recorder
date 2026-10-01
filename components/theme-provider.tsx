"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";
import { THEMES, THEME_STORAGE_KEY } from "@/constants/site";

// Puts "light" or "dark" on <html> before the first paint (an inline script,
// so there's no flash) and remembers the choice. Light until switched.
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      themes={[...THEMES]}
      defaultTheme="light"
      enableSystem={false}
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
      {...props}
    />
  );
}
