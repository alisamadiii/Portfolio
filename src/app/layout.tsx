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
        url: "https://images.unsplash.com/photo-1682687220640-9d3b11ca30e5?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
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
