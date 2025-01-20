import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Works24() {
  const [randomValue, setRandomValue] = useState(987654567);

  return (
    <div className="w-full text-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <p key={randomValue} className="text-4xl font-semibold">
          {randomValue
            .toString()
            .split("")
            .map((char, index) => (
              <motion.span
                key={char}
                initial={{ opacity: 0, y: -20, rotate: -20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: 0,
                  transition: {
                    delay: index * 0.03 + 0.1,
                    type: "spring",
                    bounce: 0.4,
                    duration: 0.5,
                  },
                }}
                exit={{ opacity: 0, y: 20, rotate: 20 }}
                transition={{
                  delay: index * 0.03,
                  type: "spring",
                  bounce: 0.4,
                  duration: 0.5,
                }}
                className="inline-block"
              >
                {char}
              </motion.span>
            ))}
        </p>
      </AnimatePresence>

      <Button
        onClick={() =>
          setRandomValue(Math.floor(Math.random() * 1000000000) + 1000000)
        }
        className="mt-8"
      >
        Generate
      </Button>
    </div>
  );
}
