"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";
import Wrapper from "@/components/designs/wrapper";

const getRandomHeight = () => Math.floor(Math.random() * 120) + 60;

export default function MorphCSS() {
  const [heights, setHeights] = useState([80, 80, 80, 80]);

  const [done, setDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!done) {
        setHeights([
          getRandomHeight(),
          getRandomHeight(),
          getRandomHeight(),
          getRandomHeight(),
        ]);
      } else {
        setHeights([200, 200, 200, 200]);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [done]);

  useEffect(() => {
    setTimeout(() => setDone(true), 5000);
  }, []);

  return (
    <Wrapper>
      <div
        className="flex h-full w-full items-center justify-center gap-1 bg-white"
        style={{ filter: done ? "blur(10px) contrast(20)" : undefined }}
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <motion.div
            key={index}
            layout
            className={cn("bg-black", done ? "translate-x-12" : "")}
            style={{
              height: heights[index],
              width: done ? 200 : 80,
              borderRadius: 9999,
              position: done ? "absolute" : "static",
            }}
          />
        ))}
      </div>
    </Wrapper>
  );
}
