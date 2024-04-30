"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ElementName({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  return (
    <AnimatePresence initial={false}>
      <motion.div key={id} className="fixed bottom-4 overflow-hidden">
        <motion.p
          initial={{ y: 25 }}
          animate={{ y: 0 }}
          exit={{ y: -25 }}
          transition={{ type: "tween", duration: 0.2 }}
          className="font-medium capitalize text-black/80"
        >
          {name}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
