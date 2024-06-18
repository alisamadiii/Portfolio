"use client";

import React from "react";
import { motion } from "framer-motion";
import { FaArrowLeft } from "react-icons/fa6";

import Wrapper from "@/components/designs/wrapper";

export default function MultiStepComponent() {
  return (
    <Wrapper>
      <motion.button
        whileHover={{
          scale: 1.1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        tabIndex={1}
        className="group bg-gray-100 p-1 focus:outline-dotted focus:outline-1 focus:outline-slate-800"
      >
        <FaArrowLeft size={24} />
      </motion.button>
    </Wrapper>
  );
}
