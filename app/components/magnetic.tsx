"use client";

import React, { type MouseEventHandler, useRef, useState } from "react";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
}

export default function Magnetic({ children }: Props) {
  const ref = useRef<null | HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const mouseMouse: MouseEventHandler<HTMLDivElement> = (event) => {
    const { clientX, clientY } = event;
    if (ref.current) {
      const { width, height, top, left } = ref.current.getBoundingClientRect();
      const x = clientX - (left + width / 2);
      const y = clientY - (top + height / 2);

      setPosition({ x, y });
    }
  };

  const mouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const { x, y } = position;

  return (
    <motion.div
      className="relative"
      ref={ref}
      onMouseMove={mouseMouse}
      onMouseLeave={mouseLeave}
      animate={{ y, x }}
      transition={{ type: "spring", stiffness: 150 }}
    >
      {children}
    </motion.div>
  );
}
