"use client";

import React from "react";
import { type HTMLMotionProps, motion } from "framer-motion";

type Props = HTMLMotionProps<"div">;

export default function AnimationWrapper({ children }: Props) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ type: "tween", duration: 0.05 }}
      className="flex min-h-screen w-full flex-col items-center justify-center"
    >
      {children}
    </motion.main>
  );
}
