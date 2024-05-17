"use client";

import React from "react";
import { motion } from "framer-motion";

interface Props {
  className?: string;
}

const DELAY = 0.1;

export default function LoadingSpinner({ className }: Props) {
  return (
    <svg
      viewBox="0 0 190 191"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g id="Group 2189">
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 0,
            ease: "linear",
          }}
          id="1"
          x="83.371"
          y="0.596436"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          fill="currentColor"
        />
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 1,
            ease: "linear",
          }}
          id="2"
          x="154.021"
          y="20.572"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          transform="rotate(45 154.021 20.572)"
          fill="currentColor"
        />
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 2,
            ease: "linear",
          }}
          id="3"
          x="189.426"
          y="83.8951"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          transform="rotate(90 189.426 83.8951)"
          fill="currentColor"
        />
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 3,
            ease: "linear",
          }}
          id="4"
          x="170.395"
          y="154.101"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          transform="rotate(135 170.395 154.101)"
          fill="currentColor"
        />
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 4,
            ease: "linear",
          }}
          id="5"
          x="83.371"
          y="131.112"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          fill="currentColor"
        />
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 5,
            ease: "linear",
          }}
          id="6"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          transform="matrix(0.707107 0.707107 0.707107 -0.707107 19.5041 154.101)"
          fill="currentColor"
        />
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 6,
            ease: "linear",
          }}
          id="7"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          transform="matrix(0 1 1 0 0.572839 83.8951)"
          fill="currentColor"
        />
        <motion.rect
          initial={{ opacity: 0.1 }}
          animate={{ opacity: [0.1, 1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.1] }}
          transition={{
            repeat: Infinity,
            duration: 0.5,
            repeatDelay: 0.3,
            delay: DELAY * 7,
            ease: "linear",
          }}
          id="8"
          width="23.1568"
          height="59.2387"
          rx="11.5784"
          transform="matrix(-0.707107 0.707107 0.707107 0.707107 35.8785 20.572)"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}
