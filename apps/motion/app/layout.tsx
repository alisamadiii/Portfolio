import { Geist_Mono, Inter, Outfit } from "next/font/google";

import "@workspace/ui/globals.css";
import "./global.css";

import { Suspense } from "react";
import { Metadata } from "next";

import { MotionFooter } from "@/components/footer";
import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import { PreviousCustomerBanner } from "@/components/previous-customer-banner";

const fontDisplay = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
});

const fontSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://motion.alisamadii.com"),
  title: {
    default: "Motion - Component & Animation Library",
    template: "%s | Motion",
  },
  description:
    "A collection of polished React components with animations, key points, and video demos to enhance your projects.",
  openGraph: {
    title: "Motion - Component & Animation Library",
    description:
      "A collection of polished React components with animations, key points, and video demos to enhance your projects.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Motion - Component & Animation Library",
    description:
      "A collection of polished React components with animations, key points, and video demos to enhance your projects.",
  },
  icons: {
    icon: "/favicon.ico",
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
        className={`${fontSans.variable} ${fontMono.variable} ${fontDisplay.variable} font-sans antialiased`}
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              <PreviousCustomerBanner />
              {children}
              <Suspense>
                <MotionFooter />
              </Suspense>
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
