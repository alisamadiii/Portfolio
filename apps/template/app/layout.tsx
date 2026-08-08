import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import "@workspace/ui/globals.css";
import "./globals.css";

import { Suspense } from "react";

import { Footer } from "@workspace/ui/components/footer";

import { JsonLd } from "@/components/json-ld";
import { siteConfig } from "@/lib/site-config";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | Web Development & Digital Solutions`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  alternates: {
    canonical: "./",
  },
  openGraph: {
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Web Development & Digital Solutions`,
    description: siteConfig.description,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | Web Development & Digital Solutions`,
    description: siteConfig.description,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-muted dark:bg-background font-sans antialiased [--primary:#6C5CE7]`}
      >
        <JsonLd />
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              {children}
              <Footer />
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
