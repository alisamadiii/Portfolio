import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Metadata } from "next";

import { Providers } from "@workspace/ui/providers";
import { TRPCReactProvider } from "@workspace/trpc/client";

import "./globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Editor",
  description: "Website editor powered by AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
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
