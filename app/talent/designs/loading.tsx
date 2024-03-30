import React from "react";
import { motion } from "framer-motion";

export default function Loading() {
  return (
    <>
      <div className="relative flex h-40 w-40 items-center justify-center">
        <motion.div
          animate={{ scale: 1.2 }}
          transition={{
            repeatType: "reverse",
            repeat: Infinity,
            duration: 1,
            delay: 0.1,
            type: "spring",
          }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 rounded-full border-4"></div>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="absolute inset-0 rounded-full border-r-4 border-black"
          />
        </motion.div>

        <motion.div
          animate={{ scale: 1.2 }}
          transition={{
            repeatType: "reverse",
            repeat: Infinity,
            duration: 1,
            type: "spring",
          }}
          className="flex h-24 w-24 items-center justify-center gap-1 rounded-full bg-gradient-to-tr from-black to-black/70"
        >
          <motion.div
            animate={{ scaleY: 0.5 }}
            transition={{
              repeatType: "reverse",
              repeat: Infinity,
              duration: 0.5,
              type: "spring",
            }}
            className="h-8 w-3 origin-bottom rounded-sm bg-white"
          />
          <motion.div
            animate={{ scaleY: 0.5 }}
            transition={{
              repeatType: "reverse",
              repeat: Infinity,
              duration: 0.8,
              type: "spring",
            }}
            className="h-8 w-3 origin-bottom rounded-sm bg-white"
          />
          <motion.div
            animate={{ scaleY: 0.5 }}
            transition={{
              repeatType: "reverse",
              repeat: Infinity,
              duration: 1,
              type: "spring",
            }}
            className="h-8 w-3 origin-bottom rounded-sm bg-white"
          />
        </motion.div>
      </div>
      <h3 className="mt-12 text-2xl font-bold tracking-tighter">
        Preparing your files
      </h3>
      <p className="mt-2 max-w-56 text-center leading-5 text-black/70">
        Lorem Ipsum is simply dummy text of the printing
      </p>
    </>
  );
}
