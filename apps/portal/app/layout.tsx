import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import "@workspace/ui/globals.css";
import "./globals.css";

import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://portal.alisamadii.com"),
  title: {
    default: "Portal | Ali Samadi",
    template: "%s | Ali Samadi",
  },
  description: "Account dashboard, settings, and customer portal.",
  openGraph: {
    title: "Portal | Ali Samadi",
    description: "Account dashboard, settings, and customer portal.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Portal | Ali Samadi",
    description: "Account dashboard, settings, and customer portal.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>{children}</Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
