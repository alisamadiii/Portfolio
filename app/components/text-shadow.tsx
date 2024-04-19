"use client";

import React, { type ReactNode } from "react";
import { motion } from "framer-motion";

interface Props {
  children: ReactNode;
}

export default function TextShadow({ children }: Props) {
  return (
    <motion.span
      // @ts-ignore
      initial={{ "--x": "100%" }}
      // @ts-ignore
      animate={{ "--x": "-100%" }}
      transition={{
        repeatType: "loop",
        repeat: Infinity,
        repeatDelay: 1,
        type: "spring",
        stiffness: 20,
        damping: 25,
        mass: 2,
      }}
      className="text_shadow_animation relative inline-block"
    >
      {children}
    </motion.span>
  );
}
