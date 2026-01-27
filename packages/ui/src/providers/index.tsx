"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Toaster } from "@workspace/ui/components/sonner";

import { NextThemeProviders } from "./next-theme";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <NuqsAdapter>
      <NextThemeProviders>
        {children} <Toaster />
      </NextThemeProviders>
    </NuqsAdapter>
  );
};
