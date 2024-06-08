"use client";

import { motion } from "framer-motion";
import React from "react";

const InesActiveCard = () => {
  return (
    <div className="flex flex-col items-center justify-center">
      <motion.p
        animate={{
          opacity: [0, 1, 1, 0],
          y: [-10, 0, -10, -10],
          transition: {
            duration: 2,
            times: [0, 0.1, 0.9, 1],
          },
        }}
      >
        Loading
      </motion.p>
    </div>
  );
};

export default InesActiveCard;
