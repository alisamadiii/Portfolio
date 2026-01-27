"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export const dynamic = "auto";

export function NextThemeProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  );
}
