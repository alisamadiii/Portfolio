import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";
// import HireMe from "@/components/hire-me";

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
        {/* <HireMe /> */}

        {children}

        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
