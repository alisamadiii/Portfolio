"use client";

import React, { type MouseEvent, useRef } from "react";
import {
  useMotionTemplate,
  useMotionValue,
  useTransform,
  motion,
  useSpring,
} from "framer-motion";

export default function ClipPath() {
  const yValue = useMotionValue(191 / 1.66);

  const containerRef = useRef<HTMLDivElement>(null);

  const onMouseOver = (event: MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;

    if (container) {
      const { top } = container.getBoundingClientRect();

      yValue.set(event.pageY - top);
    }
  };

  const onMouseLeave = () => {
    yValue.set(191 / 1.66);
  };

  const yTransform = useTransform(yValue, [0, 191], [0, 100]);
  const springYValue = useSpring(yTransform, {
    stiffness: 400,
    damping: 40,
    bounce: 0,
  });
  const motionClipPath = useMotionTemplate`inset(${springYValue}% 0 0 0)`;

  const top = useMotionTemplate`${springYValue}%`;

  console.log(yValue.get());

  return (
    <div>
      <div
        ref={containerRef}
        className="relative flex h-48 w-[500px] flex-col items-center justify-center p-8"
        onMouseMove={onMouseOver}
        onMouseLeave={onMouseLeave}
      >
        <h1
          aria-hidden
          className="w-full text-start text-3xl font-bold tracking-tighter"
        >
          Clip-path is <br /> Awesome dude!
        </h1>

        <motion.h1
          className="absolute inset-0 flex w-full items-center bg-background p-8 text-start text-3xl font-bold tracking-tighter text-transparent"
          style={{
            clipPath: motionClipPath,
            WebkitTextStroke: "1px #245595",
          }}
        >
          Clip-path is <br /> Awesome dude!
          <motion.div
            className="absolute -z-10 h-full w-full bg-gradient-to-b from-[#00346E] to-transparent"
            style={{ top: 0, left: 0 }}
          />
        </motion.h1>

        <motion.div
          className="absolute h-0.5 w-full rounded-full bg-[#0883E6]"
          style={{ top }}
        ></motion.div>

        <div className="text-[#4C84B5]">
          <svg
            viewBox="0 0 101 99"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute right-0 top-0 w-6"
          >
            <path
              d="M0.455811 3.72412H97.0376V98.9359"
              stroke="currentColor"
              strokeWidth="6"
            />
          </svg>
          <svg
            viewBox="0 0 101 99"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute left-0 top-0 w-6 -rotate-90"
          >
            <path
              d="M0.455811 3.72412H97.0376V98.9359"
              stroke="currentColor"
              strokeWidth="6"
            />
          </svg>
          <svg
            viewBox="0 0 101 99"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 left-0 w-6 -rotate-180"
          >
            <path
              d="M0.455811 3.72412H97.0376V98.9359"
              stroke="currentColor"
              strokeWidth="6"
            />
          </svg>
          <svg
            viewBox="0 0 101 99"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute bottom-0 right-0 w-6 rotate-90"
          >
            <path
              d="M0.455811 3.72412H97.0376V98.9359"
              stroke="currentColor"
              strokeWidth="6"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
