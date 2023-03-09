import Layouts from "@/components/Layouts";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { AnimatePresence } from "framer-motion";
import { Analytics } from "@vercel/analytics/react";

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <Layouts>
      <AnimatePresence mode="wait">
        <Component {...pageProps} key={router.pathname} />
        <Analytics />
      </AnimatePresence>
    </Layouts>
  );
}
