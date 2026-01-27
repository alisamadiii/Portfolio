import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Metadata } from "next";

import { SidebarProvider } from "@workspace/ui/components/sidebar";
import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import { AppSidebar } from "@/components/app-sidebar";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Template - Modern SaaS Platform",
    template: "%s | Template",
  },
  description:
    "A modern, full-stack SaaS template with authentication, payments, admin dashboard, and more.",
  openGraph: {
    title: "Template - Modern SaaS Platform",
    description:
      "A modern, full-stack SaaS template with authentication, payments, admin dashboard, and more.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Template - Modern SaaS Platform",
    description:
      "A modern, full-stack SaaS template with authentication, payments, admin dashboard, and more.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              <SidebarProvider>
                <AppSidebar />
                <main className="grow">{children}</main>
              </SidebarProvider>
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
