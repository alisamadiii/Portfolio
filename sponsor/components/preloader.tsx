import React, { useContext } from "react";
import { motion } from "framer-motion";
import { UserContext } from "@/context/User.context";

type Props = {};

export default function Preloader({}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center w-full h-screen"
    >
      {/* Items */}
      <motion.div
        className="rounded-full animate-bounce"
        style={{ boxShadow: "0 20px 20px rgba(0, 0, 0, .1)" }}
      >
        <div className="absolute w-12 h-12 border-t-[12px] rounded-full border-primary animate-spin" />
        <div className="absolute w-12 h-12 border-b-[12px] rounded-full border-secondary animate-spin" />
        <div className="w-12 h-12 border-2 rounded-full" />
      </motion.div>
    </motion.div>
  );
}
