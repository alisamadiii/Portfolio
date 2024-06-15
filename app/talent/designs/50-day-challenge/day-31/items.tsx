import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";
import { FiPlus } from "react-icons/fi";
import useMeasure from "react-use-measure";

interface Props {
  onCloseHandler: () => void;
  isOpen: boolean;
}

const buttons = ["dimensions", "aspect-ratio", "prompt"];

export default function Items({ onCloseHandler, isOpen }: Props) {
  const [active, setActive] = useState("dimensions");
  const [changeHeight, setChangeHeight] = useState(false);

  const [ref, { height }] = useMeasure();

  return (
    <>
      <motion.span
        layoutId="add-style-text"
        className="sr-only pointer-events-none inline-block"
        style={{ opacity: 0 }}
      >
        Add Style
      </motion.span>
      <header className="flex items-center justify-between">
        <motion.div
          initial={{ filter: "blur(4px)", opacity: 0 }}
          animate={{ filter: "blur(0px)", opacity: 1 }}
          exit={{ filter: "blur(4px)", opacity: 0 }}
        >
          {buttons.map((button) => (
            <button
              key={button}
              className={cn(
                "relative h-7 px-2 text-sm capitalize",
                button === active ? "text-white" : "text-[#929292]"
              )}
              onClick={async () => {
                if (!changeHeight) {
                  setChangeHeight(true);
                  await new Promise((resolve) => setTimeout(resolve, 1));
                  setActive(button);
                  return;
                }

                setActive(button);
              }}
            >
              <span className="relative z-10">
                {button.replaceAll("-", " ")}
              </span>

              {button === active && (
                <motion.div
                  layoutId="header-button-background"
                  className="pointer-events-none absolute inset-0 rounded bg-[#1D1E1D]"
                  style={{ originY: "0px" }}
                />
              )}
            </button>
          ))}
        </motion.div>
        <motion.button
          layoutId="action-button"
          className="text-2xl text-[#929292]"
          style={{ rotate: 45 }}
          onClick={onCloseHandler}
        >
          <FiPlus />
        </motion.button>
      </header>

      <motion.div
        initial={{ height: "auto" }}
        animate={{ height: changeHeight ? height : undefined }}
      >
        <div ref={ref}>
          {active === "dimensions" ? (
            <motion.div
              key={"dimensions"}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
            >
              <div className="flex h-24 items-center justify-center">
                Dimensions
              </div>
              <div className="flex justify-between pl-2">
                <small className="flex items-center gap-2 text-[#929292]">
                  <div className="h-1 w-1 rounded-full bg-[#FDFF79]"></div>
                  Changes
                </small>
                <button className="h-8 rounded-md bg-[#FDFF79] px-2 text-black">
                  Apply changes
                </button>
              </div>
            </motion.div>
          ) : active === "aspect-ratio" ? (
            <motion.div
              key={"aspect-ratio"}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
            >
              <div className="flex h-20 items-center justify-center">
                Aspect ratio
              </div>
              <div className="flex justify-between pl-2">
                <small className="flex items-center gap-2 text-[#929292]">
                  <div className="h-1 w-1 rounded-full bg-[#FDFF79]"></div>
                  Changes
                </small>
                <button className="h-8 rounded-md bg-[#FDFF79] px-2 text-black">
                  Apply changes
                </button>
              </div>
            </motion.div>
          ) : active === "prompt" ? (
            <motion.div
              key={"prompt"}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
            >
              <div className="flex h-32 items-center justify-center">
                Prompt
              </div>
              <div className="flex justify-between pl-2">
                <small className="flex items-center gap-2 text-[#929292]">
                  <div className="h-1 w-1 rounded-full bg-[#FDFF79]"></div>
                  Changes
                </small>
                <button className="h-8 rounded-md bg-[#FDFF79] px-2 text-black">
                  Apply changes
                </button>
              </div>
            </motion.div>
          ) : null}
        </div>
      </motion.div>
    </>
  );
}
