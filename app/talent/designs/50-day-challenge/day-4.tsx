"use client";

import React, { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import useMeasure from "react-use-measure";

export default function Day4() {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandler = () => {
    setIsOpen(!isOpen);
  };

  const [ref, { height }] = useMeasure();

  return (
    <div>
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <motion.div
          animate={{ height: height > 0 ? height : undefined }}
          className="overflow-hidden rounded-2xl bg-[#F5F5F5]"
        >
          <div ref={ref} className="flex w-[400px] flex-col items-center p-1">
            <motion.div
              layout
              className="grid w-full grid-cols-5 items-center rounded-2xl p-3"
              animate={{ background: isOpen ? "#ffffff" : "#F5F5F5" }}
            >
              <motion.img
                layoutId="image-layout"
                src="/50-day-challenge/rabbit-ai.png"
                alt="rabbit-ai"
                className="z-20 w-[80px]"
              />
              <div className="col-span-3">
                <AnimatePresence mode="popLayout">
                  <div className="flex font-bold">
                    <motion.h2
                      layoutId="h2-layout"
                      className={`tracking-tight`}
                    >
                      Rabbit R1
                    </motion.h2>

                    {isOpen && (
                      <motion.h2 layoutId="h2-layout" className={`text-center`}>
                        Rabbit R1
                      </motion.h2>
                    )}
                  </div>
                </AnimatePresence>

                {isOpen && (
                  <motion.img
                    layoutId="image-layout"
                    src="/50-day-challenge/rabbit-ai.png"
                    alt="rabbit-ai"
                    className="mx-auto w-[130px]"
                  />
                )}
                <motion.div
                  layout
                  className={`flex text-sm font-normal text-[#A1A1A1] ${!isOpen && "divide-x divide-[#E2E2E2]"}`}
                >
                  <p className="pr-2">
                    <motion.span layoutId="1-layout" className="inline-block">
                      1
                    </motion.span>{" "}
                    <motion.span
                      layoutId="piece-layout"
                      className="inline-block"
                    >
                      piece
                    </motion.span>
                  </p>
                  <p className="px-2">
                    <motion.span layoutId="$-layout" className="inline-block">
                      $
                    </motion.span>
                    <motion.span layoutId="89-layout" className="inline-block">
                      89
                    </motion.span>
                  </p>
                  <p className="px-2">
                    <motion.span
                      layoutId="36645-layout"
                      className="inline-block"
                    >
                      36645
                    </motion.span>
                  </p>
                </motion.div>
              </div>
              <motion.div
                layout
                className="flex flex-col items-end justify-center gap-2"
              >
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white"
                  onClick={onClickHandler}
                >
                  <svg
                    width="15"
                    height="11"
                    viewBox="0 0 15 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.8734 5.50599C14.8525 5.45868 14.3452 4.33339 13.2175 3.2057C11.7149 1.70311 9.8171 0.908998 7.72821 0.908998C5.63932 0.908998 3.74147 1.70311 2.23889 3.2057C1.1112 4.33339 0.601554 5.46048 0.582989 5.50599C0.555748 5.56726 0.541672 5.63357 0.541672 5.70063C0.541672 5.76768 0.555748 5.83399 0.582989 5.89526C0.603949 5.94257 1.1112 7.06727 2.23889 8.19496C3.74147 9.69694 5.63932 10.4911 7.72821 10.4911C9.8171 10.4911 11.7149 9.69694 13.2175 8.19496C14.3452 7.06727 14.8525 5.94257 14.8734 5.89526C14.9007 5.83399 14.9147 5.76768 14.9147 5.70063C14.9147 5.63357 14.9007 5.56726 14.8734 5.50599ZM7.72821 9.53285C5.88486 9.53285 4.27448 8.86271 2.94137 7.54158C2.3944 6.9976 1.92904 6.37732 1.55976 5.70003C1.9289 5.02265 2.39428 4.40235 2.94137 3.85848C4.27448 2.53735 5.88486 1.8672 7.72821 1.8672C9.57156 1.8672 11.1819 2.53735 12.515 3.85848C13.0631 4.40226 13.5295 5.02255 13.8997 5.70003C13.4679 6.50612 11.5868 9.53285 7.72821 9.53285ZM7.72821 2.82541C7.15966 2.82541 6.60389 2.994 6.13116 3.30987C5.65843 3.62574 5.28998 4.07469 5.07241 4.59996C4.85484 5.12523 4.79791 5.70322 4.90883 6.26084C5.01974 6.81846 5.29353 7.33067 5.69555 7.73269C6.09757 8.13471 6.60978 8.40849 7.1674 8.51941C7.72502 8.63033 8.30301 8.5734 8.82828 8.35583C9.35355 8.13826 9.8025 7.76981 10.1184 7.29708C10.4342 6.82435 10.6028 6.26857 10.6028 5.70003C10.602 4.93787 10.2989 4.20717 9.76 3.66824C9.22107 3.12932 8.49036 2.8262 7.72821 2.82541ZM7.72821 7.61644C7.34918 7.61644 6.97866 7.50404 6.66351 7.29347C6.34836 7.08289 6.10272 6.78358 5.95768 6.43341C5.81263 6.08323 5.77468 5.6979 5.84862 5.32615C5.92257 4.95441 6.10509 4.61293 6.3731 4.34492C6.64112 4.0769 6.98259 3.89438 7.35434 3.82044C7.72608 3.74649 8.11141 3.78445 8.46159 3.92949C8.81177 4.07454 9.11107 4.32017 9.32165 4.63533C9.53223 4.95048 9.64462 5.321 9.64462 5.70003C9.64462 6.20829 9.44271 6.69574 9.08332 7.05513C8.72392 7.41453 8.23647 7.61644 7.72821 7.61644Z"
                      fill="black"
                    />
                  </svg>
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                  <svg
                    width="14"
                    height="13"
                    viewBox="0 0 14 13"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="0.0430813"
                      y1="4.2107"
                      x2="13.4133"
                      y2="4.2107"
                      stroke="#060606"
                      strokeWidth="1.45864"
                    />
                    <circle
                      cx="9.07162"
                      cy="3.98707"
                      r="1.85832"
                      fill="white"
                      stroke="black"
                      strokeWidth="0.345903"
                    />
                    <line
                      x1="0.0430813"
                      y1="9.56476"
                      x2="13.4133"
                      y2="9.56476"
                      stroke="#060606"
                      strokeWidth="1.45864"
                    />
                    <circle
                      cx="4.10234"
                      cy="9.468"
                      r="1.8215"
                      fill="white"
                      stroke="black"
                      strokeWidth="0.339049"
                    />
                  </svg>
                </button>
              </motion.div>
            </motion.div>

            {isOpen && (
              <div className="mt-4 grid w-full grid-cols-3 divide-x divide-[#E2E2E2] px-8 text-xl font-normal text-[#A1A1A1]">
                <p className="flex flex-col pr-2">
                  <div className="h-6">
                    <motion.span
                      layoutId="1-layout"
                      className="absolute inline-block text-black"
                    >
                      1
                    </motion.span>
                  </div>{" "}
                  <div className="relative h-8">
                    <motion.span
                      layoutId="piece-layout"
                      className="absolute inline-block text-sm"
                    >
                      piece
                    </motion.span>
                  </div>
                </p>
                <p className="flex flex-col px-2">
                  <div className="relative h-6">
                    <motion.span
                      layoutId="89-layout"
                      className="absolute inline-block text-black"
                    >
                      89
                    </motion.span>
                  </div>
                  <div className="relative h-8">
                    <motion.span
                      layoutId="cost-layout"
                      className="inline-block text-sm"
                    >
                      Cost
                    </motion.span>
                    <motion.span
                      layoutId="$-layout"
                      className="absolute top-[6px] inline-block text-sm"
                    >
                      $
                    </motion.span>
                  </div>
                </p>
                <p className="flex flex-col px-2">
                  <div className="relative h-6">
                    <motion.span
                      layoutId="36645-layout"
                      className="absolute inline-block text-black"
                    >
                      36645
                    </motion.span>
                  </div>
                  <div className="relative h-8">
                    <motion.span
                      layoutId="hs-layout"
                      className="inline-block text-sm"
                    >
                      HS code
                    </motion.span>
                  </div>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}
