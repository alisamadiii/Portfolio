"use client";

import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "motion/react";

import { cn } from "../lib/utils";

export const BgPattern = ({
  className,
  lessVisibleOn,
}: {
  className?: string;
  lessVisibleOn?: string[];
}) => {
  const { scrollY } = useScroll();
  const backgroundY = useTransform(scrollY, [0, 500], [0, 250]);
  const pathname = usePathname();

  return (
    <motion.div
      className={cn(
        "absolute inset-0 -z-10 h-full w-full overflow-hidden",
        lessVisibleOn?.some((path) => pathname.startsWith(path)) &&
          "opacity-30",
        className
      )}
      style={{
        y: backgroundY,
      }}
    >
      <div
        className="h-full w-full"
        style={{
          backgroundColor: "#e5e5f7",
          opacity: 0.1,
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--primary) 25%, transparent 25%, transparent 75%, var(--primary) 75%, var(--primary)), repeating-linear-gradient(45deg, var(--primary) 25%, var(--background) 25%, var(--background) 75%, var(--primary) 75%, var(--primary))",
          backgroundPosition: "0 0, 40px 40px",
          backgroundSize: "80px 80px",
          maskImage: "linear-gradient(to top, transparent 45%, black)",
          transform: "skew(12deg) scale(1.5)",
        }}
      />
    </motion.div>
  );
};
