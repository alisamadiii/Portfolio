import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SuccessPurchaseDialog } from "@workspace/ui/custom/success-purchase-dialog";
import { design } from "@workspace/ui/lib/design";
import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import "@workspace/ui/globals.css";
import "./globals.css";

import { Suspense } from "react";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={
          {
            "--primary": `${design.default.color}`,
          } as React.CSSProperties
        }
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              <SuccessPurchaseDialog project="AGENCY" />
              {children}
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
