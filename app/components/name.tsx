"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useCurrentElementStore } from "../talent/page";
import { Index } from "../talent/designs";

export default function ElementName() {
  const { currentElement } = useCurrentElementStore();

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={Index[currentElement].name}
        className="fixed bottom-4 overflow-hidden"
      >
        <motion.p
          initial={{ y: 25 }}
          animate={{ y: 0 }}
          exit={{ y: -25 }}
          transition={{ type: "tween", duration: 0.2 }}
          className="font-medium capitalize text-black/80"
        >
          {Index[currentElement].name.replaceAll("-", " ")}
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}
