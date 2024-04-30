"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FormPopover() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className="flex w-full items-center justify-center"
    >
      <motion.button
        key={"button"}
        layoutId="wrapper"
        className="flex h-9 items-center border border-red-500 bg-white px-3 text-black active:!scale-[0.98]"
        style={{ borderRadius: 8 }}
      >
        <motion.span layoutId="title" className="inline-block">
          Send feedback
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="wrapper"
            className="absolute h-[200px] w-[364px] bg-white outline-none"
          >
            <motion.span
              layoutId="title"
              className="absolute left-4 top-4 text-sm text-[#63635d]"
            >
              Send feedback
            </motion.span>

            <form
              className="h-full border border-red-500"
              style={{ borderRadius: 12 }}
            ></form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
