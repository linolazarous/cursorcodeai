// apps/web/components/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * ThemeProvider for CursorCode AI
 *
 * Forces dark cyber-futuristic theme to perfectly match the logo + advertising video.
 * No light mode allowed — consistent dark aesthetic everywhere.
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"           // Strongly enforce dark mode (no user override)
      enableSystem={false}         // Disable system theme detection
      disableTransitionOnChange    // Prevent flash on initial load
      storageKey="cursorcode-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
