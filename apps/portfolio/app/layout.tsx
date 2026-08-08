import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";

import { Suspense } from "react";
import { Metadata } from "next";
import { DevTools } from "@alisamadiillc/devtools";

import { BgPattern } from "@workspace/ui/components/bg-pattern";
import { Footer } from "@workspace/ui/components/footer";
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
    default: "Ali Samadi - Portfolio",
    template: "%s | Ali Samadi",
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "./",
  },
  openGraph: {
    siteName: SITE_NAME,
    title: "Ali Samadi - Portfolio",
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
    title: "Ali Samadi - Portfolio",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
        <JsonLd />
        <Providers>
          <Suspense>
            {/* <BgPattern lessVisibleOn={["/client/", "/blog/how-i-build"]} /> */}
            {children}
            <Footer />
            <DevTools />
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
