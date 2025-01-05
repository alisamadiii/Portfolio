import React, { useState } from "react";
import { motion } from "framer-motion";

import * as Element from "@/components/TwitterContentsElement";
import { Button } from "@/components/ui/button";

const easing = [
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  [0.25, 0.1, 0.25, 1.0],
];

export default function TwitterContent25() {
  const [justify, setJustify] = useState<"start" | "end">("start");

  return (
    <Element.Wrapper>
      <Element.Preview>
        <div className="flex w-full flex-col items-center gap-2">
          {easing.map((easing) => (
            <div
              key={easing.toString()}
              className="relative flex w-full items-center gap-2 rounded-xl bg-neutral-200 p-2"
              style={{ justifyContent: justify }}
            >
              <motion.div
                layout
                transition={{
                  duration: 0.6,
                  ease:
                    typeof easing === "string"
                      ? easing
                          .split("-")
                          .map((word, i) =>
                            i === 0
                              ? word
                              : word[0].toUpperCase() + word.slice(1)
                          )
                          .join("")
                      : easing,
                }}
                className="size-10 shrink-0 rounded-full bg-neutral-900"
              />
              <motion.p
                initial={{ x: justify === "start" ? 45 : 0 }}
                animate={{ x: justify === "start" ? 45 : 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute left-4 text-sm text-neutral-500"
              >
                {typeof easing === "string"
                  ? easing
                  : `cubic-bezier(${easing[0]}, ${easing[1]}, ${easing[2]}, ${easing[3]})`}
              </motion.p>
            </div>
          ))}
        </div>
        <Button
          onClick={() =>
            setJustify((prev) => (prev === "start" ? "end" : "start"))
          }
        >
          Animate
        </Button>
      </Element.Preview>
    </Element.Wrapper>
  );
}
