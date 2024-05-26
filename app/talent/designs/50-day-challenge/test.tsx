"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Test() {
  const [isAdding, setIsAdding] = useState(false);

  const handleToggleIsAdding = () => setIsAdding(!isAdding);

  return (
    <motion.div className="grid h-96 w-full place-content-center">
      <motion.div
        layoutId="wrapper"
        className="w-fit rounded border border-neutral-300 p-2"
      >
        <motion.button layoutId="btn" onClick={handleToggleIsAdding}>
          👋
        </motion.button>
      </motion.div>

      <AnimatePresence mode="popLayout">
        {isAdding && (
          <motion.div
            layoutId="wrapper"
            className="grid h-32 w-32 place-content-end rounded border border-neutral-300 bg-white p-2"
          >
            <motion.button layoutId="btn" onClick={handleToggleIsAdding}>
              👋
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
