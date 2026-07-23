import "@workspace/ui/globals.css";

import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { portalLoginUrl, urls } from "@workspace/ui/lib/company";
import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";
import { createHttpCaller } from "@workspace/trpc/http-caller";
import { SessionRefreshProvider } from "@workspace/auth/providers/session-refresh-provider";

import { NavbarAdmin } from "@/components/navbar-admin";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://admin.alisamadii.com"),
  title: {
    default: "Admin | Ali Samadi",
    template: "%s | Admin",
  },
  description:
    "Internal admin dashboard for managing clients, projects, and operations.",
  openGraph: {
    title: "Admin | Ali Samadi",
    description:
      "Internal admin dashboard for managing clients, projects, and operations.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Admin | Ali Samadi",
    description:
      "Internal admin dashboard for managing clients, projects, and operations.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

/** tRPC surfaces the error code on `data` — checking it beats matching copy. */
function isUnauthorized(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED"
  );
}

async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headersStore = await headers();
  const httpCaller = createHttpCaller(headersStore);

  let currentUser;

  try {
    currentUser = await httpCaller.users.getSession.query();
  } catch (error) {
    // Admin has no login UI of its own — the portal owns auth
    if (isUnauthorized(error)) {
      redirect(portalLoginUrl(urls.admin));
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
    <>
      <NavbarAdmin />
      <div className="pb-16">{children}</div>
    </>
  );
}

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <TRPCReactProvider>
          <Providers>
            <SessionRefreshProvider>
              <Suspense>
                <AdminLayout>{children}</AdminLayout>
              </Suspense>
            </SessionRefreshProvider>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default Layout;
