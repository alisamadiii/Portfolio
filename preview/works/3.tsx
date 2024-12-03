"use client";

import React, { useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimate,
  type Variants,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";

export default function Work3() {
  const [num, setNum] = useState(0);
  const [direction, setDirection] = useState(1);

  const [scope, animate] = useAnimate();

  const onClickHandler = (action: "decrease" | "increase") => {
    if (action === "decrease") {
      if (num === 0) {
        animate(scope.current, { x: [0, 5, -5, 0] }, { duration: 0.2 });
        return;
      }

      setNum(num - 1);
      setDirection(-1);
    } else if (action === "increase") {
      if (num === 20) {
        animate(scope.current, { x: [0, 5, -5, 0] }, { duration: 0.2 });
        return;
      }
      setNum(num + 1);
      setDirection(1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div
        ref={scope}
        className="flex items-center justify-center gap-8 text-4xl"
      >
        <button
          onClick={() => onClickHandler("decrease")}
          className={cn(
            "bg-box flex h-14 w-14 items-center justify-center rounded-full text-xl active:scale-90",
            num === 0 && "opacity-50"
          )}
        >
          <Minus />
        </button>
        <h3 className="w-12 text-center">
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            {num
              .toString()
              .split("")
              .map((value, index) => (
                <motion.span
                  key={`${value} ${index}`}
                  variants={animation}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  custom={direction}
                  className="inline-block tabular-nums"
                >
                  {value}
                </motion.span>
              ))}
          </AnimatePresence>
        </h3>
        <button
          onClick={() => onClickHandler("increase")}
          className={cn(
            "bg-box flex h-14 w-14 items-center justify-center rounded-full text-xl active:scale-90",
            num === 20 && "opacity-50"
          )}
        >
          <Plus />
        </button>
      </div>
      <p className="text-muted-2">20 is the max number.</p>
    </div>
  );
}

const animation: Variants = {
  hidden: (direction: -1 | 1) => ({
    y: direction === 1 ? 30 : -30,
    opacity: 0,
    filter: "blur(4px)",
  }),
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
  },
  exit: (direction: -1 | 1) => ({
    y: direction === 1 ? -30 : 30,
    opacity: 0,
    filter: "blur(4px)",
  }),
};
