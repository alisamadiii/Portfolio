import type { Metadata } from "next";
import "./globals.css";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { ThemeProvider } from "next-themes";
import ThemeButton from "@/components/ThemeButton";
import GithubRepo from "@/components/GithubRepo";

export const metadata: Metadata = {
  title: "Ali Samadi",
  description: "Let's build something awesome together!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="px-4">
        <ThemeProvider attribute="class" disableTransitionOnChange>
          {children}

          <ThemeButton />

          <GithubRepo />
        </ThemeProvider>
      </body>
    </html>
  );
}
