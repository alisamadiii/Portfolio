"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Day27() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const updateProgress = () => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          return 100; // Ensure the progress doesn't go above 100
        }
        const randomIncrement = Math.floor(Math.random() * 40) + 1; // Generate a random number between 1 and 10
        return Math.min(prevProgress + randomIncrement, 100); // Ensure progress doesn't exceed 100
      });
    };

    const interval = setInterval(
      updateProgress,
      Math.floor(Math.random() * 1000) + 1000
    ); // Random interval between 76 and 1076 ms

    return () => clearInterval(interval); // Clean up the interval on component unmount
  }, []);

  return (
    <div className="flex items-center justify-center text-6xl font-bold">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.h1
          key={progress}
          initial={{ opacity: 0, rotateX: 90 }}
          animate={{ opacity: 1, rotateX: 0 }}
          exit={{ opacity: 0, rotateX: -90 }}
          transition={{ duration: 0.8, type: "spring", bounce: 0 }}
          className="origin-top"
        >
          {progress}
        </motion.h1>
      </AnimatePresence>
      <motion.span layout className="inline-block">
        %
      </motion.span>
    </div>
  );
}
