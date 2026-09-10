"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

import { Toaster } from "@workspace/ui/components/sonner";

export const LeadsProviders = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      enableColorScheme
    >
      {children} <Toaster />
    </NextThemesProvider>
  );
};
