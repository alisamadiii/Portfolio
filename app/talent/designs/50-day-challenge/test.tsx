"use client";

import React from "react";
import {
  motion,
  useMotionValue,
  useVelocity,
  useTransform,
} from "framer-motion";

const pink = (saturation: number) => `hsl(327, ${saturation}%, 50%)`;

export default function Test() {
  const x = useMotionValue(0);

  /**
   * Smooth x with useSpring. This isn't always neccessary but we're using
   * a drag gesture to change x and user input can be noisey.
   */
  // const xSmooth = useSpring(x, { damping: 50, stiffness: 400 });

  /**
   * Create a motion value from the smoothed output of x
   */
  const xVelocity = useVelocity(x);

  /**
   * Transform the velocity of x into a scale motion value
   */
  const scale = useTransform(xVelocity, [-3000, 0, 3000], [2, 1, 2], {
    clamp: false,
  });

  /**
   * Transform the velocity of x into a range of background color intensities
   */
  const backgroundColor = useTransform(
    xVelocity,
    [-2000, 0, 2000],
    [pink(100), pink(0), pink(100)]
  );

  return (
    <motion.div
      drag="x"
      className="h-12 w-12"
      dragElastic={1}
      dragConstraints={{ left: -200, right: 200 }}
      style={{ x, scale, backgroundColor }}
    />
  );
}
