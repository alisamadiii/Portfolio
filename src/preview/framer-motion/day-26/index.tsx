"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FaApple } from "react-icons/fa";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import useMeasure from "react-use-measure";

const initialValues: any = {
  store: {
    shop: ["Shop the Latest", "Mac", "iPad", "iPhone", "Apple Watch"],
    "quick-links": ["Find a store", "Find a store", "Find a store"],
  },
  mac: {
    shop: [""],
    "quick-links": [""],
  },
};

export default function Day26() {
  const [hovered, setHovered] = useState<string | null>(null);

  const [ref, { height }] = useMeasure();

  return (
    <div className="h-dvh w-full bg-white text-black">
      <nav className="fixed left-0 top-0 isolate z-50 w-full">
        <MotionConfig transition={{ duration: 0.8, type: "spring", bounce: 0 }}>
          <div className="mx-auto flex h-11 w-full max-w-5xl items-center gap-2">
            <Link href={"#"} className="px-2">
              <FaApple />
            </Link>
            <ul className="flex h-full gap-2">
              {Object.entries(initialValues).map(([key, value], index) => (
                <li
                  key={index}
                  className="flex h-full cursor-pointer items-center justify-center px-2 text-xs capitalize text-black/80 hover:text-black"
                  onMouseOver={() => setHovered(key)}
                >
                  {key}
                </li>
              ))}
            </ul>
          </div>

          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height }}
                exit={{ height: 0 }}
                className="absolute left-0 top-0 -z-10 w-full overflow-hidden bg-gray-100"
              >
                <div ref={ref} className="py-20">
                  <ul className="mx-auto flex w-full max-w-5xl gap-12">
                    {Object.entries(initialValues[hovered]).map(
                      ([key, value]: any, index) => (
                        <li
                          key={index}
                          className="h-full cursor-pointer text-xs font-light capitalize text-black/80 hover:text-black"
                        >
                          {key}

                          {index === 0 ? (
                            <ul className="mt-4 flex flex-col gap-2 text-2xl font-bold">
                              {value.map((d: any, index: number) => (
                                <motion.li
                                  key={index}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      delay: 0.05 * index + 0.1,
                                      type: "tween",
                                    },
                                  }}
                                >
                                  {d}
                                </motion.li>
                              ))}
                            </ul>
                          ) : (
                            <ul className="mt-4 flex flex-col gap-2 text-sm">
                              {value.map((d: any, index: number) => (
                                <motion.li
                                  key={index}
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                    transition: {
                                      delay: 0.05 * index + 0.1,
                                      type: "tween",
                                    },
                                  }}
                                >
                                  {d}
                                </motion.li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.2 } }}
                exit={{ opacity: 0 }}
                className="absolute left-0 top-0 -z-20 h-dvh w-full bg-white/50 backdrop-blur-lg"
                onMouseOver={() => setHovered(null)}
              />
            )}
          </AnimatePresence>
        </MotionConfig>
      </nav>

      <div className="flex flex-col items-center justify-center gap-28 pt-64">
        <h1 className="text-7xl font-bold">iPhone</h1>
        <video
          src="https://www.apple.com/105/media/us/iphone/family/2024/1efec3e0-8619-4684-a57e-6e2310394f08/anim/welcome/xlarge_2x.mp4"
          autoPlay
          muted
          loop
        ></video>
      </div>
    </div>
  );
}
