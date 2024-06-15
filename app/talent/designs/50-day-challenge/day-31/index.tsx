"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { FiPlus } from "react-icons/fi";

import Wrapper from "@/components/designs/wrapper";
import Items from "./items";

export default function Day31() {
  const [isOpen, setIsOpen] = useState(false);

  const onIconClickHandler = () => setIsOpen(!isOpen);

  console.log("rendering");

  return (
    <Wrapper className="bg-[#0F0F0F] text-white">
      <MotionConfig transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}>
        <motion.button
          layoutId="wrapper"
          className="group flex h-12 w-32 items-center justify-center gap-1 border border-border bg-[#161716] p-2 active:bg-[#222422]"
          onClick={onIconClickHandler}
          style={{ borderRadius: 14 }}
        >
          <motion.span
            layoutId="add-style-text"
            className="inline-block text-[#929292] group-hover:text-white"
          >
            Add Style
          </motion.span>
          <motion.span layoutId="action-button" className="text-xl">
            <FiPlus />
          </motion.span>
        </motion.button>

        <AnimatePresence mode="popLayout">
          {isOpen && (
            <motion.div
              layoutId="wrapper"
              className="relative w-full max-w-96 overflow-hidden border border-border bg-[#161716] p-2"
              style={{ borderRadius: 12 }}
            >
              <Items onCloseHandler={onIconClickHandler} isOpen={isOpen} />
            </motion.div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </Wrapper>
  );
}
