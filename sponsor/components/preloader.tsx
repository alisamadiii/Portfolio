import React from "react";
import { motion } from "framer-motion";

type Props = {};

export default function Preloader({}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center w-full h-screen"
    >
      {/* Items */}
      <motion.div className="rounded-full animate-squish">
        <div className="absolute w-12 h-12 border-t-[12px] rounded-full border-primary animate-spin" />
        <div className="absolute w-12 h-12 border-b-[12px] rounded-full border-secondary animate-spin" />
        <div className="w-12 h-12 border-2 rounded-full" />
      </motion.div>
    </motion.div>
  );
}
