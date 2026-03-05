"use client";

import { ReactNode, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

import { cn } from "@workspace/ui/lib/utils";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function MagneticButton({
  children,
  className,
  onClick,
}: MagneticButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouse = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onClick={onClick}
      className={cn(
        "font-heading border-accent bg-accent text-accent-foreground hover:text-accent group relative inline-flex items-center justify-center overflow-hidden border px-8 py-4 text-sm font-semibold tracking-[0.15em] uppercase transition-colors duration-300 hover:bg-transparent",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
