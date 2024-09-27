import React, { useState } from "react";
import { ClockArrowDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  onValueChange: (value: number) => void;
  speeds: number[];
};

export default function AnimationSpeed({ onValueChange, speeds }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const onClickHandler = () => {
    if (currentIndex === speeds.length - 1) {
      setCurrentIndex(0);
      onValueChange(speeds[0]);
    } else {
      setCurrentIndex(currentIndex + 1);
      onValueChange(speeds[currentIndex]);
    }
  };

  return (
    <button
      className="absolute right-4 top-4 flex h-6 items-center gap-2 overflow-hidden rounded-md bg-natural-300/30 px-2 text-sm active:scale-95"
      onClick={onClickHandler}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={speeds[currentIndex]}
          initial={{ opacity: 0, transform: "translateY(5px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          exit={{ opacity: 0, transform: "translateY(-5px)" }}
          transition={{ duration: 0.1 }}
        >
          {speeds[currentIndex]}s
        </motion.span>
      </AnimatePresence>
      <ClockArrowDown className="w-3" />
    </button>
  );
}
