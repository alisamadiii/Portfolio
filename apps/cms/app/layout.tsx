import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { TRPCReactProvider } from "@workspace/trpc/client";
import { Toaster } from "@workspace/ui/components/sonner";
import { cn } from "@workspace/ui/lib/utils";

import { getBaseUrl } from "@/lib/base-url";

import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});
const appUrl = getBaseUrl();
const socialImage = "/images/social-card.png";
const description = "Manage your website, content, billing and requests in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    template: "%s | Client Hub",
    default: "Client Hub",
  },
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "Client Hub",
    title: "Client Hub",
    description,
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: "Client Hub social card",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Client Hub",
    description,
    images: [socialImage],
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
        className={cn(
          "bg-background min-h-screen font-sans antialiased",
          inter.variable,
          jetbrainsMono.variable
        )}
      >
        <TRPCReactProvider>
          <Providers user={null}>{children}</Providers>
        </TRPCReactProvider>
        <Toaster />
      </body>
    </html>
  );
}
