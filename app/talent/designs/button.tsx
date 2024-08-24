"use client";

import React from "react";
import { motion, useAnimate } from "framer-motion";

import Wrapper from "@/components/designs/wrapper";

export default function Button() {
  const [scope, animate] = useAnimate();

  const onMouseEnter = () => {
    animate(
      "#background",
      { scale: 0.8, borderRadius: 0 },
      { duration: 0.7, type: "spring", bounce: 0 }
    );
    animate("#text-behind", { opacity: 0 });
    animate(
      "#text-forward",
      { x: 0 },
      { duration: 0.7, type: "spring", bounce: 0 }
    );
    animate(
      scope.current,
      { boxShadow: "0 4px 10px rgba(0, 0, 0, .1)" },
      { duration: 0.7, type: "spring", bounce: 0 }
    );
  };

  const onMouseLeave = () => {
    animate(
      "#background",
      { scale: 1, borderRadius: "12px" },
      { duration: 0.7, type: "spring", bounce: 0 }
    );
    animate("#text-behind", { opacity: 1 });
    animate(
      "#text-forward",
      { x: "-100%" },
      { duration: 0.7, type: "spring", bounce: 0 }
    );
    animate(
      scope.current,
      { boxShadow: "0" },
      { duration: 0.7, type: "spring", bounce: 0 }
    );
  };

  return (
    <Wrapper>
      <button
        ref={scope}
        className="relative isolate overflow-hidden rounded-xl px-6 py-3 text-white shadow-none"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span id="text-behind">Button Animation</span>
        <motion.div
          id="background"
          className="absolute inset-0 -z-10 rounded-xl bg-blue-500"
        />

        <motion.div
          initial={{ x: "-100%" }}
          id="text-forward"
          className="absolute inset-0 flex items-center justify-center bg-white text-black"
        >
          Button Animation
        </motion.div>
      </button>
    </Wrapper>
  );
}
