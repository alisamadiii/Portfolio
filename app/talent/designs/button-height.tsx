"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function ButtonHeight() {
  const [clicked, setClicked] = useState(false);

  const onClickHandler = () => setClicked(!clicked);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setClicked(false);
    }, 2400);

    return () => {
      clearTimeout(timeout);
    };
  }, [clicked]);

  return (
    <div>
      <motion.button
        animate={{ width: clicked ? 40 : 192, rotate: clicked ? 360 : 0 }}
        transition={{
          rotate: {
            delay: 0.4,
            duration: clicked ? 1 : 0,
            repeat: Infinity,
            ease: "linear",
          },
          width: { duration: 0.1, type: "spring", damping: 15 },
        }}
        className="flex h-10 items-center justify-center overflow-hidden rounded-2xl bg-violet-700 text-white"
        onClick={onClickHandler}
      >
        {!clicked && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Click me!
          </motion.span>
        )}
      </motion.button>
    </div>
  );
}
