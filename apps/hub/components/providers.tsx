"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";

import { UserProvider } from "@/contexts/user-context";

import { User } from "@/types/user";

import { TooltipProvider } from "@workspace/ui/components/tooltip";

import { ThemeProvider } from "@/components/theme-provider";

export function Providers({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  return (
    <NuqsAdapter>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <UserProvider user={user}>
          <TooltipProvider>{children}</TooltipProvider>
        </UserProvider>
      </ThemeProvider>
    </NuqsAdapter>
  );
}
