import { motion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

interface MarqueeProps {
  items: string[];
  className?: string;
  speed?: number; // duration in seconds
  reverse?: boolean;
}

export function Marquee({
  items,
  className,
  speed = 20,
  reverse = false,
}: MarqueeProps) {
  // We render the list 4 times to ensure seamless looping
  const repeated = [...items, ...items, ...items, ...items];

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: reverse ? "100%" : "-100%" }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
        className={cn("flex whitespace-nowrap", reverse && "justify-end")}
      >
        {Array.from({ length: 10 }).map((_, _index) =>
          repeated.map((item, i) => (
            <div
              key={`${item}-${_index}-${i}`}
              className="flex shrink-0 items-center gap-6 px-6"
            >
              <span className="font-heading text-foreground/10 text-6xl font-bold select-none md:text-8xl">
                {item}
              </span>
              <span className="bg-accent/30 h-3 w-3 shrink-0 rounded-full" />
            </div>
          ))
        )}
      </motion.div>
    </div>
  );
}
