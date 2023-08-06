import "../styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../context/User.context";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/router";

import Layouts from "../layouts";

export const pageVariants = {
  pageInitial: {
    y: 20,
  },
  pageAnimate: {
    y: 0,
  },
};

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  return (
    <UserProvider>
      <Layouts>
        <AnimatePresence>
          <motion.div
            key={router.route} // Ensure a unique animation for each page
            initial="pageInitial"
            animate="pageAnimate"
            transition={{ duration: 0.2, type: "tween" }}
            variants={pageVariants} // Apply the animation variants
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </Layouts>
    </UserProvider>
  );
}
