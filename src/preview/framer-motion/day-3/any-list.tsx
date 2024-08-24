import React from "react";
import { motion } from "framer-motion";

interface Props {
  values: Array<number | string>;
  index: number;
  rowHeight: number;
  middleIndex: number;
  style: any;
}

export default function AnyList({
  values,
  index,
  style,
  rowHeight,
  middleIndex,
}: Props) {
  const value = values[index];
  const distanceFromMiddle = Math.abs(index - middleIndex);
  const opacity = distanceFromMiddle === 0 ? 1 : 1 / (distanceFromMiddle + 1);
  // const rotateX = distanceFromMiddle * 20; // Adjust this value to control the rotation angle

  const combinedStyle = {
    opacity,
    // transform: `rotateX(${rotateX}deg)`,
    transformOrigin: "center",
    height: `${rowHeight}px`,
    display: "flex",
    alignItems: "center",
    flex: "0 0 auto",
    transition: "200ms opacity",
  };

  return value === "" ? (
    <div></div>
  ) : (
    <motion.div
      layoutId={index.toString()}
      style={{ ...style, ...combinedStyle }}
      data-index={index}
    >
      {value}
    </motion.div>
  );
}
