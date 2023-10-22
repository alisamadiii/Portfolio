import React from "react";

import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/User.context";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "Ali Reza - Portfolio",
  description:
    "As a front-end developer, I specialize in building and maintaining the user interface of web applications.",
  openGraph: {
    title: "Ali Reza - Portfolio",
    description:
      "As a front-end developer, I specialize in building and maintaining the user interface of web applications.",
    url: "https://www.alirezasamadi.com/",
    images: [
      {
        url: "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/project/metadata-image.jpg",
        width: 800,
        height: 600,
      },
    ],
  },
  twitter: {
    title: "Ali Reza - Portfolio",
    description:
      "As a front-end developer, I specialize in building and maintaining the user interface of web applications.",
    site: "https://www.alirezasamadi.com/",
    images: [
      {
        url: "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/project/metadata-image.jpg",
        width: 800,
        height: 600,
      },
    ],
  },
  icons: {
    icon: "/Logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="icon"
          href="../../public/Logo.png"
          type="image/png"
          sizes="32x32"
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans text-accents-6`}
      >
        <UserProvider>
          <div className="grid-line" />
          <main>{children}</main>
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
