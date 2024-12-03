import React, { HTMLAttributes, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

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
        <div className="absolute inset-0 flex items-center justify-center">
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
              "pointer-events-none z-50 aspect-square h-14 rounded-full border border-gray-300 bg-gray-200/60",
              className
            )}
          />
        </div>
      )}
    </AnimatePresence>
  );
});

NavigatingClick.displayName = "NavigatingClick";

interface NavigatingDragProps extends Props {
  direction: "up" | "down" | "left" | "right";
}

const NavigatingDrag = React.memo(
  ({ className, direction }: NavigatingDragProps) => {
    const [show, setShow] = useState(true);

    useEffect(() => {
      setTimeout(() => {
        setShow(false);
      }, 1600);
    }, []);

    return (
      <AnimatePresence>
        {show && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 flex items-center justify-center",
              className
            )}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                scale: [1, 0.7, 0.7, 1],
                x:
                  direction === "left"
                    ? [100, 100, 0]
                    : direction === "right"
                      ? [-100, -100, 0]
                      : [0, 0, 0],
                y:
                  direction === "up"
                    ? [100, 100, 0]
                    : direction === "down"
                      ? [-100, -100, 0]
                      : [0, 0, 0],
                transition: {
                  scale: { delay: 0.7, duration: 0.7 },
                  x: { delay: 0.7, duration: 0.7 },
                  y: { delay: 0.7, duration: 0.7 },
                  opacity: { delay: 0.2, duration: 0.4 },
                },
              }}
              exit={{ opacity: 0 }}
              className={cn(
                "pointer-events-none z-50 h-14 w-14 rounded-full border border-gray-300 bg-gray-200/60"
              )}
            />
          </div>
        )}
      </AnimatePresence>
    );
  }
);

NavigatingDrag.displayName = "NavigatingDrag";

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

export { NavigatingHover, NavigatingClick, NavigatingDrag };
