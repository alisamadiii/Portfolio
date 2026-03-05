"use client";

import { cn } from "@workspace/ui/lib/utils";

interface MarqueeProps {
  items: string[];
  className?: string;
  speed?: "slow" | "normal" | "fast";
}

export function Marquee({ items, className, speed = "normal" }: MarqueeProps) {
  const speedClass = {
    slow: "animate-[marquee_30s_linear_infinite]",
    normal: "animate-marquee",
    fast: "animate-[marquee_12s_linear_infinite]",
  };

  const doubled = [...items, ...items];

  return (
    <div className={cn("overflow-hidden", className)}>
      <div className={cn("flex whitespace-nowrap", speedClass[speed])}>
        {doubled.map((item, i) => (
          <span
            key={i}
            className="font-heading text-foreground/10 flex items-center gap-6 px-6 text-6xl font-bold md:text-8xl"
          >
            {item}
            <span className="bg-accent/30 h-3 w-3 rounded-full" />
          </span>
        ))}
      </div>
    </div>
  );
}
