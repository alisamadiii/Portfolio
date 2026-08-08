import "./global.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";

import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.alisamadii.com"),
  title: {
    default: "Ali Samadi Docs",
    template: "%s | Ali Samadi Docs",
  },
  description:
    "Documentation for Ali Samadi's stack — Next.js, tRPC, Drizzle, Better Auth, S3, and more.",
  alternates: {
    canonical: "./",
  },
  openGraph: {
    siteName: "Ali Samadi Docs",
    title: "Ali Samadi Docs",
    description:
      "Documentation for Ali Samadi's stack — Next.js, tRPC, Drizzle, Better Auth, S3, and more.",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ali Samadi Docs logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ali Samadi Docs",
    description:
      "Documentation for Ali Samadi's stack — Next.js, tRPC, Drizzle, Better Auth, S3, and more.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider>
          <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  );
}
