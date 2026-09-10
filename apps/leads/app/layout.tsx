import "./globals.css";

import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { hubLoginUrl, urls } from "@workspace/ui/lib/company";

import { TRPCReactProvider } from "@workspace/trpc/client";
import { createHttpCaller } from "@workspace/trpc/http-caller";
import { SessionRefreshProvider } from "@workspace/auth/providers/session-refresh-provider";

import { LeadsProviders } from "@/components/providers";

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
    default: "Lead Finder | Ali Samadi",
    template: "%s | Lead Finder",
  },
  description:
    "Internal tool: find local businesses without websites and turn them into leads.",
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

  let currentUser;

  try {
    // Leads has no login UI of its own — the Client Hub owns auth
    currentUser = await httpCaller.users.getSession.query();
  } catch (error) {
    if (isUnauthorized(error)) {
      redirect(hubLoginUrl(urls.leads));
    }

    console.error(error);
    return (
      <div>
        Internal Server Error{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  // Signed in but not an admin — 404 rather than bounce, which would loop
  if (currentUser?.role !== "admin") {
    return notFound();
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4">
      <header className="flex items-center justify-between border-b py-4">
        <Link href="/" className="text-lg font-semibold">
          Lead Finder
        </Link>
        <span className="text-muted-foreground text-sm">
          Local businesses without websites
        </span>
      </header>
      <main className="flex-1 py-6">{children}</main>
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
            <SessionRefreshProvider>
              <Suspense>
                <LeadsLayout>{children}</LeadsLayout>
              </Suspense>
            </SessionRefreshProvider>
          </LeadsProviders>
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default Layout;
