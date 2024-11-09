import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";
import FixedImage from "@/components/FixedImage";

import { Toaster } from "@/components/ui/sonner";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Ali Samadi - Portfolio",
  description: "Building Website is My Passion!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${lora.variable} ${inter.variable} bg-natural-100 antialiased`}
      >
        <FixedImage />

        {children}

        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
