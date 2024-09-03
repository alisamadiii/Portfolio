"use client";

import React, { useState } from "react";
import { MotionConfig, motion } from "framer-motion";

export default function Day46() {
  const [checked, setChecked] = useState(false);
  const [pressed, setPressed] = useState(false);

  const onClickHandler = () => setChecked(!checked);

  return (
    <div>
      <button
        className={`bg-box flex h-48 w-96 rounded-full p-4 ${checked ? "justify-end" : ""}`}
        onClick={onClickHandler}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
      >
        <MotionConfig transition={{ duration: 0.4, type: "tween" }}>
          <motion.div
            layout
            className={`relative aspect-square h-full rounded-full bg-foreground`}
          >
            <motion.div
              animate={{
                scaleX: pressed ? 1.1 : 1,
                originX: checked ? "right" : "left",
              }}
              transition={{ originX: { delay: 0.5 } }}
              className={`absolute inset-0 rounded-full bg-foreground`}
            ></motion.div>
          </motion.div>
        </MotionConfig>
      </button>
    </div>
  );
}
