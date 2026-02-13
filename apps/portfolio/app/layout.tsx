import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Metadata } from "next";

import { BgPattern } from "@workspace/ui/components/bg-pattern";
import { Footer } from "@workspace/ui/components/footer";
import { Providers } from "@workspace/ui/providers";

import { TRPCReactProvider } from "@workspace/trpc/client";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

// const fontHeading = Momo_Trust_Display({
//   subsets: ["latin"],
//   weight: "400",
//   variable: "--font-heading",
// });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Ali Samadi - Portfolio",
    template: "%s | Ali Samadi",
  },
  description: "A collection of my projects and experiences.",
  openGraph: {
    title: "Ali Samadi - Portfolio",
    description: "A collection of my projects and experiences.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ali Samadi - Portfolio",
    description: "A collection of my projects and experiences.",
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
              <BgPattern lessVisibleOn={["/settings", "/client/"]} />
              {children}
              <Footer isPortfolio />
            </Suspense>
          </Providers>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
