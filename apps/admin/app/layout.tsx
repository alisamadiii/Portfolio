import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";
import { caller } from "@workspace/trpc/server";

import { Login } from "@/components/login";
import { NavbarAdmin } from "@/components/navbar-admin";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Admin",
  description: "Admin page",
};

async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const headersStore = await headers();
    const currentUser = await caller.user.getSession({ headers: headersStore });

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              <AdminLayout>{children}</AdminLayout>
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
};

export default Layout;
