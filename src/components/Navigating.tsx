import React, { HTMLAttributes, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/utils";

interface Props extends HTMLAttributes<HTMLDivElement> {}

const NavigatingClick = React.memo(({ className }: Props) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShow(false);
    }, 1600);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            scale: [1, 0.7, 1],
            transition: {
              scale: { delay: 0.7, duration: 0.7 },
              opacity: { delay: 0.2, duration: 0.4 },
            },
          }}
          exit={{ opacity: 0 }}
          className={cn(
            "pointer-events-none absolute z-50 h-14 w-14 rounded-full border border-gray-300 bg-gray-200/60",
            className
          )}
        />
      )}
    </AnimatePresence>
  );
});

NavigatingClick.displayName = "NavigatingClick";

const NavigatingHover = React.memo(({ className }: Props) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setShow(false);
    }, 1600);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            y: [100, 0],
            x: [50, 0],
            scaleX: [0.5, 1],
          }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.4, duration: 1, type: "spring", bounce: 0.1 }}
          className={cn(
            "pointer-events-none absolute z-50 h-10 w-10 rounded-full border border-gray-300 bg-gray-200/60",
            className
          )}
        />
      )}
    </AnimatePresence>
  );
});

NavigatingHover.displayName = "NavigatingHovers";

export { NavigatingHover, NavigatingClick };
