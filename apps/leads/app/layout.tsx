import "./globals.css";

import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { Crosshair } from "lucide-react";

import { hubLoginUrl, hubSignupUrl, urls } from "@workspace/ui/lib/company";

import { TRPCReactProvider } from "@workspace/trpc/client";
import { createHttpCaller } from "@workspace/trpc/http-caller";

import { BillingHistoryButton } from "@/components/billing-history-button";
import { CreditsBalance } from "@/components/credits-balance";
import { LeadsProviders } from "@/components/providers";
import { NavPills } from "@/components/nav-pills";
import { SignOutButton } from "@/components/sign-out-button";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lead Finder | Ali Samadii LLC",
    template: "%s | Lead Finder",
  },
  description:
    "Find local businesses without a working website and turn them into clients. Pay only for the leads you find.",
};

/** tRPC surfaces the error code on `data` — checking it beats matching copy. */
function isUnauthorized(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED"
  );
}

async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const headersStore = await headers();
  const httpCaller = createHttpCaller(headersStore);

  let currentUser = null;

  try {
    // Leads has no login UI of its own — the Client Hub owns auth. Signed-out
    // visitors stay here and get the marketing experience.
    currentUser = await httpCaller.users.getSession.query();
  } catch (error) {
    if (!isUnauthorized(error)) {
      console.error(error);
      return (
        <div>
          Internal Server Error{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </div>
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4">
      <header className="bg-card mt-4 flex items-center justify-between rounded-full px-3 py-2.5 shadow-sm sm:px-5">
        <div className="flex items-center gap-4">
          <Link
            href={currentUser ? "/" : "/home"}
            className="flex items-center gap-2.5"
          >
            <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full">
              <Crosshair className="size-4.5" />
            </span>
            <span className="text-lg font-semibold tracking-tight max-sm:hidden">
              Lead Finder
            </span>
          </Link>
          {currentUser ? (
            <NavPills />
          ) : (
            <nav className="bg-muted flex items-center gap-1 rounded-full p-1">
              <Link
                href="/home"
                className="text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                href="/inspect"
                className="text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              >
                Inspect
              </Link>
            </nav>
          )}
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2">
            <CreditsBalance />
            <BillingHistoryButton />
            <SignOutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <a
              href={hubLoginUrl(urls.leads)}
              className="text-muted-foreground hover:text-foreground rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            >
              Sign in
            </a>
            <a
              href={hubSignupUrl(urls.leads)}
              className="bg-foreground text-background rounded-full px-4 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Get started
            </a>
          </div>
        )}
      </header>
      <main className="flex-1 py-8">{children}</main>
    </div>
  );
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <TRPCReactProvider>
          <LeadsProviders>
            <Suspense>
              <LeadsLayout>{children}</LeadsLayout>
            </Suspense>
          </LeadsProviders>
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default Layout;
