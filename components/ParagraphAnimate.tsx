"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
}

export default function ParagraphAnimate({ children }: Props) {
  return (
    <div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-5 leading-6 text-muted"
      >
        {children}
      </motion.p>
    </div>
  );
}
