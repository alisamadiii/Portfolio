import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function BlurryText() {
  const [input, setInput] = useState("");

  return (
    <div className="fixed inset-0 h-full w-full bg-black">
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 2 }}
        className="absolute inset-0"
      >
        <Image
          src={
            "https://images.unsplash.com/photo-1526289034009-0240ddb68ce3?q=80&w=3271&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          }
          width={1200}
          height={900}
          alt=""
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 isolate flex flex-col items-center justify-center text-white">
        <motion.div
          initial={{ backdropFilter: "blur(0px)" }}
          animate={{ backdropFilter: "blur(20px)" }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute inset-0 -z-10 bg-black/50"
        />

        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="mb-2 text-3xl font-semibold"
        >
          <motion.span
            animate={{
              opacity: input.length > 0 ? 0.4 : 1,
              filter: input.length > 0 ? "blur(2px)" : "blur(0px)",
            }}
            transition={{ duration: 0.2 }}
          >
            Join us now!
          </motion.span>
        </motion.h1>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          className="max-w-lg text-center font-light text-white/50"
        >
          <motion.span
            animate={{
              opacity: input.length > 0 ? 0.4 : 1,
              filter: input.length > 0 ? "blur(2px)" : "blur(0px)",
            }}
            transition={{ duration: 0.2 }}
          >
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
            Reprehenderit quisquam culpa accusamus laboriosam aliquid laborum.
          </motion.span>
        </motion.p>

        <div className="isolate flex items-center justify-center">
          <motion.input
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.7, duration: 1 }}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="mt-4 h-12 w-72 rounded-full bg-white/10 px-4 outline-none"
            placeholder="type..."
          />
        </div>
      </div>
    </div>
  );
}
