import { useMotionValue , motion } from "framer-motion";
import Image from "next/image";
import React, { useEffect } from "react";
import { cn } from "@/utils";

interface Props {
  values: Array<{ id: number; url: string }>;
  currentStory: number;
  setCurrentStory: (a: number) => void;
  position: "right" | "left";
}

export default function SideContent({
  values,
  currentStory,
  position,
  setCurrentStory,
}: Props) {
  const left = useMotionValue(0);

  useEffect(() => {
    const resizeHandler = () => {
      const middleElement = document.querySelector(
        "#middle-story"
      ) as HTMLDivElement;

      const { left: divLeft, width } = middleElement?.getBoundingClientRect();

      left.set(divLeft + width + 80);
    };

    resizeHandler();

    window.addEventListener("resize", resizeHandler);

    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  return (
    <motion.div
      style={{
        right: position === "left" ? left : undefined,
        left: position === "right" ? left : undefined,
      }}
      className={cn(
        "absolute flex h-[70dvh] grow gap-20 md:h-[40dvh]",
        position === "right" ? "" : "justify-end"
      )}
    >
      {values
        .filter((value) => {
          if (position === "right") {
            return value.id > currentStory;
          } else {
            return value.id < currentStory;
          }
        })
        .map((value) => (
          <motion.div
            key={value.id}
            layoutId={value.id.toString()}
            className="relative aspect-[9/16] h-full overflow-hidden"
            style={{ flex: "0 0 auto", borderRadius: 8 }}
            onClick={() => setCurrentStory(value.id)}
          >
            <Image
              src={value.url}
              width={600}
              height={800}
              alt=""
              className="pointer-events-none h-full w-full object-cover"
            />
          </motion.div>
        ))}
    </motion.div>
  );
}
