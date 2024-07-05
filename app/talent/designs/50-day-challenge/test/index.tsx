"use client";

import React, { useEffect, useRef, useState } from "react";
import { useOnClickOutside } from "usehooks-ts";
import { motion, AnimatePresence } from "framer-motion";

const Page: React.FC = () => {
  const [activeWave, setActiveWave] = useState<null | string>(null);

  const ref = useRef(null);

  useOnClickOutside(ref, () => setActiveWave(null));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveWave(null);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="center relative flex aspect-square h-full w-full flex-col overflow-hidden rounded-2xl bg-black px-10 py-16 ring-1 ring-black/10">
      <div className="flex w-full flex-col gap-8 bg-black px-16">
        <motion.div
          layoutId="long-wave"
          className="h-32 w-full bg-red-600"
          onClick={() => setActiveWave("long")}
        ></motion.div>
        <motion.div
          layoutId="middle-wave"
          className="h-32 w-full bg-red-600"
          onClick={() => setActiveWave("middle")}
        ></motion.div>
        <motion.div
          layoutId="short-wave"
          className="h-32 w-full bg-red-600"
          onClick={() => setActiveWave("short")}
        ></motion.div>
      </div>

      <AnimatePresence>
        {activeWave ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="center absolute inset-0 z-10 flex h-full w-full flex-col bg-black/80 px-16"
          >
            <div ref={ref} className="w-full">
              {activeWave === "long" ? (
                <LongWave />
              ) : activeWave === "middle" ? (
                <MiddleWave />
              ) : activeWave === "short" ? (
                <ShortWave />
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default Page;

// ----------------- Components ----------------- //

const LongWave = () => {
  return (
    <motion.div
      layoutId="long-wave"
      className="relative flex h-32 w-full flex-col gap-6 overflow-hidden bg-red-600 px-3 py-2 ring-1 ring-zinc-200/30"
      style={{ borderRadius: 8 }}
    ></motion.div>
  );
};

const MiddleWave = () => {
  return (
    <motion.div
      layoutId="middle-wave"
      className="relative flex h-32 w-full flex-col gap-6 overflow-hidden bg-red-600 px-3 py-2 ring-1 ring-zinc-200/30"
      style={{ borderRadius: 8 }}
    ></motion.div>
  );
};

const ShortWave = () => {
  return (
    <motion.div
      layoutId="short-wave"
      className="relative flex h-32 w-full flex-col gap-6 overflow-hidden bg-red-600 px-3 py-2 ring-1 ring-zinc-200/30"
      style={{ borderRadius: 8 }}
    ></motion.div>
  );
};
