import { Cabin_Condensed, Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Metadata } from "next";

import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

import { SuccessPurchaseDialog } from "@/components/success-purchase-dialog";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontHeading = Cabin_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
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
        className={`${fontSans.variable} ${fontHeading.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <TRPCReactProvider>
          <Providers>
            <Suspense>
              <SuccessPurchaseDialog />
              <main className="overflow-x-hidden">{children}</main>
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
