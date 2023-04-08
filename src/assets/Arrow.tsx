import React from "react";
import { motion } from "framer-motion";

type Props = {};

export default function Arrow({}: Props) {
  return (
    <a href="#back-to-top" className="z-[9999]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 8.467 8.467"
        id="up-arrow"
        className="fixed bottom-4 right-4"
      >
        <motion.path
          initial={{ opacity: 0, rotate: 30, scale: 0 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 30, scale: 0 }}
          transition={{ duration: 0.3 }}
          className="Arrow"
          d="M2.123 7.674c-.732 0-1.33-.598-1.33-1.33V2.123c0-.732.598-1.33 1.33-1.33h4.22c.733 0 1.331.598 1.331 1.33v4.22c0 .733-.598 1.33-1.33 1.33zm3.722-2.37a.265.265 0 0 0 .163-.466L4.42 3.252a.265.265 0 0 0-.373 0L2.459 4.838a.265.265 0 0 0 .158.453.265.265 0 0 0 .215-.08l1.4-1.397 1.403 1.397a.265.265 0 0 0 .21.093z"
          color="#000"
          fontFamily="sans-serif"
          fontWeight="400"
          overflow="visible"
        ></motion.path>
      </svg>
    </a>
  );
}
