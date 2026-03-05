import { ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

interface GridCellProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
  noHover?: boolean;
}

export function GridCell({
  children,
  className,
  delay = 0,
  noPadding = false,
  noHover = false,
}: GridCellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(
        "group border-border relative overflow-hidden border transition-colors duration-500",
        !noHover && "hover:bg-white/[0.02]",
        !noPadding && "p-8 md:p-10",
        className
      )}
    >
      {/* Top hover glow line */}
      <div className="via-accent absolute top-0 left-0 h-px w-full scale-x-0 bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover:scale-x-100" />
      {/* Bottom hover glow line */}
      <div className="via-accent/30 absolute bottom-0 left-0 h-px w-full scale-x-0 bg-gradient-to-r from-transparent to-transparent transition-transform delay-100 duration-700 ease-out group-hover:scale-x-100" />
      {/* Corner dots */}
      <div className="bg-accent/0 group-hover:bg-accent/50 absolute top-2 left-2 h-1 w-1 rounded-full transition-colors duration-500" />
      <div className="bg-accent/0 group-hover:bg-accent/50 absolute top-2 right-2 h-1 w-1 rounded-full transition-colors delay-75 duration-500" />
      <div className="bg-accent/0 group-hover:bg-accent/50 absolute bottom-2 left-2 h-1 w-1 rounded-full transition-colors delay-150 duration-500" />
      <div className="bg-accent/0 group-hover:bg-accent/50 absolute right-2 bottom-2 h-1 w-1 rounded-full transition-colors delay-200 duration-500" />
      {children}
    </motion.div>
  );
}
