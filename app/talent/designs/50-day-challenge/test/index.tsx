"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useState } from "react";

const InesActiveCard = () => {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandle = () => setIsOpen(!isOpen);

  return (
    <div className="flex flex-col items-center justify-center gap-32">
      <button
        className="h-8 rounded-md bg-white px-4 text-black active:scale-95"
        onClick={onClickHandle}
      >
        Make big
      </button>

      <motion.div
        layoutId="wrapper"
        className="h-32 w-32 bg-[#fad658]"
        style={{ borderRadius: 24 }}
      ></motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            layoutId="wrapper"
            className="absolute inset-0 flex items-center justify-center bg-[#fad658]"
          >
            <button
              className="h-8 rounded-md bg-white px-4 text-black active:scale-95"
              onClick={onClickHandle}
            >
              Make big
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InesActiveCard;
