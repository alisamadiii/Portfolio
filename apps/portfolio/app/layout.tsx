import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Metadata } from "next";
import { DevTools } from "@alisamadiillc/devtools";

import { BgPattern } from "@workspace/ui/components/bg-pattern";
import { Providers } from "@workspace/ui/providers";

import { JsonLd } from "@/components/json-ld";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Ali Samadi",
    template: "%s | Ali Samadi",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "./",
  },
  openGraph: {
    siteName: SITE_NAME,
    title: "Ali Samadi",
    description: SITE_DESCRIPTION,
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ali Samadi",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Gveret+Levin&display=swap"
        />
      </head>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <JsonLd />
        <Providers>
          <Suspense>
            {/* <BgPattern lessVisibleOn={["/client/", "/blog/how-i-build"]} /> */}
            {children}
            <DevTools />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
