"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import useMeasure from "react-use-measure";

export default function SubListToggle() {
  const [isOpen, setIsOpen] = useState(true);

  const [isSubList, setIsSubList] = useState(false);

  const [ref, { height }] = useMeasure();

  return (
    <div className="relative">
      <button
        className="h-8 rounded-md bg-black px-4 text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        open
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
              originX: "right",
              originY: "top",
            }}
            animate={{
              opacity: 1,
              scale: 1,
              height: height > 0 ? height : undefined,
              transition: {
                duration: 0.15,
                type: "tween",
                ease: "easeInOut",
                opacity: { delay: 0.03 },
              },
            }}
            exit={{
              opacity: 0,
              scale: 0.9,
              transition: {
                duration: 0.15,
                type: "tween",
                ease: "easeInOut",
              },
            }}
            className="absolute right-0 top-[calc(100%+20px)] isolate overflow-hidden rounded-[10px] bg-white shadow-[rgba(0,0,0,0.12)_0px_4px_18px_0px]"
          >
            <motion.div ref={ref} className="w-96 px-[14px] py-3">
              <AnimatePresence initial={false} mode="popLayout">
                {!isSubList ? (
                  <motion.div
                    key={"not-sublist"}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      transition: {
                        delay: 0.2,
                      },
                    }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{
                      duration: 0.15,
                      type: "tween",
                      ease: "easeInOut",
                    }}
                    className="-z-10 flex w-full flex-col"
                  >
                    <button
                      className="flex items-center justify-between bg-white px-3 py-[14px]"
                      onClick={() => setIsSubList(true)}
                    >
                      Developer
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="-rotate-90"
                      >
                        <path
                          d="M1.5 3.5L5 7L8.5 3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>
                      </svg>
                    </button>
                    <button className="flex items-center justify-between bg-white px-3 py-[14px]">
                      Resources
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="-rotate-90"
                      >
                        <path
                          d="M1.5 3.5L5 7L8.5 3.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>
                      </svg>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      transition: {
                        delay: 0.2,
                        type: "tween",
                        ease: "easeInOut",
                        duration: 0.1,
                      },
                    }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{
                      duration: 0.15,
                      type: "tween",
                      ease: "easeInOut",
                    }}
                    key={"sublist"}
                    className="flex flex-col"
                  >
                    <button
                      className="flex items-center justify-start gap-2 px-2 text-sm text-gray-400"
                      onClick={() => setIsSubList(false)}
                    >
                      <svg
                        width="11"
                        height="10"
                        viewBox="0 0 11 10"
                        className="rotate-180"
                      >
                        <rect
                          y="4.25"
                          width="10.5"
                          height="1.5"
                          rx="0.75"
                          fill="currentColor"
                        ></rect>
                        <path
                          d="M5.75 1L9.75 5L5.75 9"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>
                      </svg>
                      back to menu
                    </button>
                    <button className="flex items-center justify-between bg-white px-3 py-[14px]">
                      Sub list
                    </button>
                    <button className="flex items-center justify-between bg-white px-3 py-[14px]">
                      Sub list
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
