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
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex whitespace-nowrap"
        animate={{
          x: reverse ? ["0%", "50%"] : ["0%", "-50%"],
        }}
        transition={{
          x: {
            duration: speed,
            repeat: Infinity,
            ease: "linear",
            repeatType: "loop",
          },
        }}
      >
        {repeated.map((item, i) => (
          <div
            key={`${item}-${i}`}
            className="flex shrink-0 items-center gap-6 px-6"
          >
            <span className="font-heading text-foreground/10 text-6xl font-bold select-none md:text-8xl">
              {item}
            </span>
            <span className="bg-accent/30 h-3 w-3 shrink-0 rounded-full" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
