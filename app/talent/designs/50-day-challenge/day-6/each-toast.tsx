import React from "react";
import { motion } from "framer-motion";

import { type ToasterTypes } from ".";

interface Props {
  value: ToasterTypes;
  index: number;
  length: number;
  onDeleteHandler: (a: string) => void;
}

export default function EachToast({
  value,
  index,
  length,
  onDeleteHandler,
}: Props) {
  return (
    <motion.li
      layoutId={value.id}
      initial={{ opacity: 0, y: 40 }}
      animate={{
        opacity: length - 1 - index > 2 ? 0 : 1,
        y: 0,
        scale: 1 - (length - 1 - index) * 0.1,
      }}
      exit={{ opacity: 0, y: 40 }}
      className="relative mt-[-64px] flex w-[356px] flex-col justify-center rounded-lg border border-[hsl(0,0%,93%)] bg-white p-4 shadow-[0_4px_12px_#0000001a]"
    >
      <div className="flex justify-between">
        <p>{value.title}</p>
        <button
          className="flex h-6 w-6 items-center justify-center"
          onClick={() => onDeleteHandler(value.id)}
        >
          X
        </button>
      </div>
      <small>
        {value.description} - {value.id}
      </small>
    </motion.li>
  );
}
