"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const buttons = ["idle", "notification", "error"];

export default function Test() {
  const [currentButton, setCurrentButton] = useState<null | string>(null);

  const onClickHandler = (value: string) => {
    setCurrentButton(value);
  };

  const currentView = {
    idle: <div>idle</div>,
    notification: <div>notification</div>,
    error: <div>error</div>,
    // @ts-ignore
  }[currentButton];

  return (
    <div className="space-y-48">
      <div className="h-12 rounded-lg border border-gray-300 bg-gray-100">
        <AnimatePresence initial={false} mode="popLayout">
          {currentButton === "idle" ? (
            <motion.div
              initial={{ filter: "blur(4px)", opacity: 0, scale: 0.9 }}
              animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
              exit={{
                filter: "blur(4px)",
                opacity: 0,
                scale: 0.9,
              }}
              key={"idle"}
              className="flex h-full items-center justify-center"
            >
              {currentView}
            </motion.div>
          ) : currentButton === "notification" ? (
            <motion.div
              initial={{ filter: "blur(4px)", opacity: 0, scale: 0.9 }}
              animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
              exit={{
                filter: "blur(4px)",
                opacity: 0,
                scale: 0.9,
              }}
              key={"notifcation"}
              className="flex h-full items-center justify-center"
            >
              {currentView}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
      <div className="flex gap-4">
        {buttons.map((button) => (
          <button
            key={button}
            className="h-8 rounded-md border border-gray-300 bg-gray-100 px-4 duration-100 active:scale-95 active:bg-opacity-75"
            onClick={() => onClickHandler(button)}
          >
            {button}
          </button>
        ))}
      </div>
    </div>
  );
}
