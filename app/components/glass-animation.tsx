"use client";

import React from "react";
import { motion } from "framer-motion";

export default function GlassAnimation() {
  return (
    <motion.div
      className="absolute inset-0"
      initial={{ x: "-100%" }}
      animate={{ x: "100%" }}
      transition={{
        repeatType: "loop",
        repeat: Infinity,
        repeatDelay: 2,
        type: "spring",
        stiffness: 20,
        damping: 25,
        mass: 2,
      }}
      style={{
        background:
          "linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, .1) 70%, transparent 100%)",
      }}
    />
  );
}
