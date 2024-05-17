"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import LoadingSpinner from "@/components/loading-spinner";

export default function Day1() {
  const [section, setSection] = useState<0 | 1 | 2>(0);

  const onClickHandler = () => {
    if (section === 0) {
      setSection(1);
    }
  };

  useEffect(() => {
    if (section === 1) {
      const timeout = setTimeout(() => {
        setSection(2);
      }, 2000);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [section]);

  return (
    <div className="flex h-full w-full justify-center overflow-hidden">
      <button
        className="flex h-12 w-64 items-center justify-center rounded-lg border bg-black px-12 text-xl text-white duration-100 active:!scale-95"
        onClick={onClickHandler}
      >
        <MotionConfig
          transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {section === 0 ? (
              <motion.span
                key={"login"}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="inline-block w-full"
              >
                Log in
              </motion.span>
            ) : section === 1 ? (
              <motion.p
                key={"loading"}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: {
                    delay: 0.2,
                    type: "tween",
                    ease: "easeInOut",
                    duration: 0.2,
                  },
                }}
                exit={{ scale: 1.4, opacity: 0 }}
                className="inline-block"
              >
                <LoadingSpinner className="w-5 text-white" />
              </motion.p>
            ) : (
              <motion.span
                key={"welcome"}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  transition: {
                    delay: 0.2,
                    type: "tween",
                    ease: "easeInOut",
                    duration: 0.2,
                  },
                }}
                exit={{ scale: 1.4, opacity: 0 }}
                className="inline-block w-full"
              >
                Welcome
              </motion.span>
            )}
          </AnimatePresence>
        </MotionConfig>
      </button>
    </div>
  );
}
