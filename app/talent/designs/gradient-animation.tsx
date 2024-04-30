"use client";

import {
  useMotionTemplate,
  motion,
  useMotionValue,
  animate,
} from "framer-motion";
import React, { useEffect } from "react";

const COLORS = ["#443C68", "#F0EB8D", "#1363DF", "#35858B"];

export default function GradientAnimation() {
  const color = useMotionValue(COLORS[0]);

  const backgroundImage = useMotionTemplate`radial-gradient(125% 125% at 50% 0%, #2D2727 50%, ${color})`;
  const border = useMotionTemplate`1px solid ${color}`;
  const boxShadow = useMotionTemplate`0 0px 20px ${color}`;
  const textColor = useMotionTemplate`-webkit-linear-gradient(#2d2727, ${color})`;

  useEffect(() => {
    animate(color, COLORS, {
      ease: "easeInOut",
      duration: 10,
      repeat: Infinity,
      repeatType: "mirror",
    });
  }, []);

  return (
    <motion.div
      className="absolute left-0 top-0 flex h-full w-full flex-col items-center justify-center text-white"
      style={{
        backgroundImage,
      }}
    >
      <h1 className="text-5xl font-bold">
        Keep improving{" "}
        <motion.span
          style={{
            background: textColor,
          }}
          className="gradient__text"
        >
          everyday
        </motion.span>
      </h1>
      <p className="mt-4 max-w-3xl text-center text-sm text-white/50">
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Quos
        perspiciatis, itaque adipisci velit quisquam veniam ullam, alias
        distinctio commodi eius expedita. Minima reiciendis eveniet soluta
        magnam aperiam? Deserunt, molestias porro.
      </p>
      <motion.button
        className="mt-8 rounded-full p-2 px-4"
        style={{ border, boxShadow }}
      >
        Get started
      </motion.button>
    </motion.div>
  );
}
