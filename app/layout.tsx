import "./globals.css";

import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";

import Navbar from "./components/navbar";
import Footer from "./components/footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.alirezasamadi.com/"),
  title: {
    default: "Ali Reza",
    template: "%s | Portfolio",
  },
  description:
    "I've got 2+ years of web dev experience, mainly focusing on front-end magic with ReactJS.",
  openGraph: {
    title: "Ali Reza",
    description: "Developer, writer, and creator.",
    url: "https://www.alirezasamadi.com/",
    siteName: "Ali Reza",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/project/opengraph-image.png",
        width: 800,
        height: 600,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${GeistSans.className} bg-background py-16 text-foreground max-md:px-4`}
      >
        <div className="mx-auto max-w-2xl">
          <Navbar />
        </div>
        <main className="relative mx-auto flex max-w-2xl flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
