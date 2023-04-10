import React from "react";
import { motion } from "framer-motion";

type Props = {};

export default function Intro({}: Props) {
  return (
    <motion.div
      animate={{ height: 0 }}
      transition={{ duration: 0.7, delay: 3.9 }}
      className="fixed top-0 left-0 z-50 flex flex-col items-center justify-center w-full h-full gap-4 overflow-hidden text-white bg-white"
    >
      <div className="absolute top-0 left-0 w-full h-full bg-gradient -z-10"></div>
      <motion.h1
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="font-black text-7xl md:text-9xl"
      >
        Hi
      </motion.h1>
      <motion.p
        className="text-2xl md:text-4xl"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        Welcome to My Website
      </motion.p>
      <motion.p
        className="text-2xl md:text-4xl"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 2 }}
      >
        My name is
      </motion.p>
      <motion.div
        initial={{
          bottom: 100,
          width: 32,
          height: 32,
          borderRadius: 9999,
          background: "white",
        }}
        animate={{
          bottom: 0,
          width: "100%",
          height: "100%",
          borderRadius: 0,
          background: "white",
        }}
        transition={{ duration: 0.3, delay: 3.5 }}
        className="absolute animate-pulse"
      ></motion.div>
    </motion.div>
  );
}
