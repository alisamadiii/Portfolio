"use client";

import React, { useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useDragControls,
} from "framer-motion";

import Intro from "./intro";

export default function Day7() {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandler = () => setIsOpen(!isOpen);

  const dragControls = useDragControls();

  return (
    <div className="relative isolate w-full overflow-hidden bg-black">
      <MotionConfig transition={{ duration: 0.6, type: "spring", bounce: 0 }}>
        <motion.div
          initial={{ borderRadius: 0, scale: 1 }}
          animate={{ scale: isOpen ? 0.9 : 1, borderRadius: isOpen ? 28 : 0 }}
          className="bg-white"
        >
          <Intro onClickHandler={onClickHandler} />
        </motion.div>

        <AnimatePresence>
          {isOpen && (
            <div className="absolute inset-0 flex">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "100%" }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0.2, bottom: 1 }}
                dragControls={dragControls}
                dragListener={false}
                onDragEnd={(event, info) => {
                  if (info.offset.y >= 200) {
                    setIsOpen(false);
                  }
                }}
                className="mt-[50dvh] flex h-[100vh] w-full justify-center rounded-t-[40px] bg-white shadow-[0_-20px_40px_rgba(0,0,0,.1)]"
              >
                <button
                  className="flex h-2 w-full items-center justify-center py-3"
                  onPointerDown={(e) => {
                    dragControls.start(e);
                  }}
                >
                  <span className="inline-block h-1 w-8 rounded-full bg-black"></span>
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}
