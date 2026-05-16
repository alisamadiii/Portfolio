import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";
import { createHttpCaller } from "@workspace/trpc/http-caller";
import { SessionRefreshProvider } from "@workspace/auth/providers/session-refresh-provider";

import { Login } from "@/components/login";
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
  description: "Internal admin dashboard for managing clients, projects, and operations.",
  openGraph: {
    title: "Admin | Ali Samadi",
    description: "Internal admin dashboard for managing clients, projects, and operations.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Admin | Ali Samadi",
    description: "Internal admin dashboard for managing clients, projects, and operations.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const headersStore = await headers();
    const httpCaller = createHttpCaller(headersStore);
    const currentUser = await httpCaller.users.getSession.query();

    if (currentUser?.role !== "admin") {
      return notFound();
    }

    return (
      <>
        <NavbarAdmin />
        <div className="pb-16">{children}</div>
      </>
    );
  } catch (error) {
    console.error(error);
    if (
      error instanceof Error &&
      error.message.includes("You must be logged in to access this resource")
    ) {
      return <Login />;
    }
    return (
      <div>
        Internal Server Error{" "}
        {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }
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
