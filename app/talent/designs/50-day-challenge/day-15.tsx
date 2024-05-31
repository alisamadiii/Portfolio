"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import IphoneSimulator from "@/components/iphone-simulator";

export default function Day15() {
  const [off, setOff] = useState(false);

  const onOffClickHandler = () => setOff(!off);

  return (
    <div>
      <IphoneSimulator
        mixBlend={false}
        topElements={{ left: false, right: !off }}
        bottomLine={!off}
        onPowerClickHandler={onOffClickHandler}
        transition={{ duration: 1, type: "spring", bounce: 0 }}
      >
        <img
          src="https://i.pinimg.com/736x/32/c8/8f/32c88f04229985d28fb6cbe153bb8133.jpg"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />

        <AnimatePresence initial={false}>
          {off && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60"
            ></motion.div>
          )}
        </AnimatePresence>

        <motion.div
          //   animate={{ y: off ? 10 : 0 }}
          className="flex flex-col items-center justify-center pt-8 text-white"
        >
          <h3 className="relative flex items-center justify-center text-xl">
            <motion.span
              animate={{ y: off ? 20 : 0 }}
              className="mix-blend-overlay"
            >
              Thursday, May 30
            </motion.span>
            <motion.span
              animate={{ y: off ? 20 : 0 }}
              className="absolute opacity-50"
            >
              Thursday, May 30
            </motion.span>
          </h3>
          <motion.h2
            layout
            initial={{ fontVariationSettings: '"wght" 600' }}
            animate={{
              fontVariationSettings: off ? '"wght" 400' : '"wght" 600',
            }}
            className="relative flex items-center justify-center text-8xl tracking-tighter"
          >
            <motion.span
              animate={{ y: off ? 20 : 0 }}
              className="mix-blend-overlay"
            >
              9:45
            </motion.span>
            <motion.span
              animate={{ y: off ? 20 : 0 }}
              className="absolute opacity-50"
            >
              9:45
            </motion.span>
          </motion.h2>
        </motion.div>
      </IphoneSimulator>
    </div>
  );
}
