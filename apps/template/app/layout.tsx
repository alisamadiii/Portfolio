import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SuccessPurchaseDialog } from "@workspace/ui/custom/success-purchase-dialog";
import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import "@workspace/ui/globals.css";
import "./globals.css";

import { Suspense } from "react";

import { Footer } from "@workspace/ui/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AliSamadii Agency | Web Development & Digital Solutions",
  description:
    "Custom websites, admin panels, hosting, and digital solutions to grow your business.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-muted dark:bg-background antialiased [--primary:#6C5CE7]`}
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              <SuccessPurchaseDialog project="AGENCY" />
              {children}
              <Footer />
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
