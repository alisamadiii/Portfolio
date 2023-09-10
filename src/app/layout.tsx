import "./globals.css";
import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const space_grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

import { Toaster } from "@/components/ui/toaster";
import Intro from "@/components/intro";

export const metadata: Metadata = {
  title: "Ali Reza",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${space_grotesk.variable} font-sans`}>
        <div className="grid-line" />
        <Intro />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
