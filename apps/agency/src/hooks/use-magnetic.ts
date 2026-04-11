import { useMotionValue, useSpring, type MotionStyle } from "motion/react";
import { type RefObject, useRef, useEffect } from "react";

/**
 * Magnetic micro-physics (Skill Section 4, MOTION>5).
 * Uses Framer Motion useMotionValue — NEVER useState — to avoid re-renders.
 */
export function useMagnetic<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  style: MotionStyle;
} {
  const ref = useRef<T>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 20 });
  const springY = useSpring(y, { stiffness: 150, damping: 20 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      x.set((e.clientX - r.left - r.width / 2) * 0.3);
      y.set((e.clientY - r.top - r.height / 2) * 0.3);
    };

    const onLeave = () => {
      x.set(0);
      y.set(0);
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  return { ref, style: { x: springX, y: springY } };
}
