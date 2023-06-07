import React from "react";
import { motion } from "framer-motion";

type Props = {};

export default function Arrow({}: Props) {
  return (
    <a href="#back-to-top" className="z-[9999]">
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        viewBox="0 0 8.467 8.467"
        id="up-arrow"
        className="fixed duration-200 bottom-4 right-4 hover:!scale-90"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        transition={{ duration: 0.3, type: "spring" }}
      >
        <path
          className="Arrow fill-dark-blue"
          d="M2.123 7.674c-.732 0-1.33-.598-1.33-1.33V2.123c0-.732.598-1.33 1.33-1.33h4.22c.733 0 1.331.598 1.331 1.33v4.22c0 .733-.598 1.33-1.33 1.33zm3.722-2.37a.265.265 0 0 0 .163-.466L4.42 3.252a.265.265 0 0 0-.373 0L2.459 4.838a.265.265 0 0 0 .158.453.265.265 0 0 0 .215-.08l1.4-1.397 1.403 1.397a.265.265 0 0 0 .21.093z"
          fontFamily="sans-serif"
          fontWeight="400"
          overflow="visible"
        />
      </motion.svg>
    </a>
  );
}
