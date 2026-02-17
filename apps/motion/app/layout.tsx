import { DM_Serif_Display, Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Metadata } from "next";

import { Footer } from "@workspace/ui/components/footer";
import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import { PreviousCustomerBanner } from "@/components/previous-customer-banner";
import { SuccessPurchaseDialog } from "@/components/success-purchase-dialog";

const fontHeading = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
});

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} ${fontHeading.variable} font-sans antialiased [--primary:#2b7fff]`}
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              <PreviousCustomerBanner />
              <SuccessPurchaseDialog />
              {children}
              <Suspense>
                <Footer hide={["/m/"]} />
              </Suspense>
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
