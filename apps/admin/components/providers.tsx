"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "@workspace/ui/components/sonner";

/**
 * Admin-local provider stack — same shape as the shared Providers.
 * Light is the default look; the header toggle flips to dark.
 * The shared package stays untouched.
 */
export const AdminProviders = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <NuqsAdapter>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
        enableColorScheme
      >
        {children} <Toaster />
      </NextThemesProvider>
    </NuqsAdapter>
  );
};
