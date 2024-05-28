import React from "react";
import { format, isToday } from "date-fns";
import { motion } from "framer-motion";

interface Props {
  daysFrom2015To2030: string[];
  index: number;
  rowHeight: number;
  middleIndex: number;
  style: any;
}

export default function DateList({
  daysFrom2015To2030,
  index,
  style,
  rowHeight,
  middleIndex,
}: Props) {
  const day = daysFrom2015To2030[index];

  const combinedStyle = {
    // opacity,
    // transform: `rotateX(${rotateX}deg)`,
    transformOrigin: "center",
    height: `${rowHeight}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    flex: "0 0 auto",
    transition: "200ms opacity",
  };

  return day === "" ? (
    <div></div>
  ) : (
    <motion.time
      layoutId={index.toString()}
      style={{ ...style, ...combinedStyle }}
      dateTime={format(day, "yyyy-MM-dd")}
      data-index={index}
      transition={{ layout: { type: "tween", ease: "backOut" } }}
    >
      {isToday(day) ? "Today" : format(day, "eee MMM d")}
    </motion.time>
  );
}
