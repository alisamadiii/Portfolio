import React, { useState } from "react";
import { FolderClosed } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {};

const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96C", "#FFB84D"];

export default function Works23({}: Props) {
  const [color, setColor] = useState("#FF6B6B");

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="relative flex items-center justify-center overflow-hidden">
        <FolderClosed className="h-48 w-48" />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 2 }}
          exit={{ scale: 0 }}
          transition={{ duration: 0.5 }}
          key={color}
          className="absolute h-48 w-48 rounded-full mix-blend-lighten"
          style={{ backgroundColor: color }}
        />
      </div>

      <div className="flex items-center justify-center gap-4">
        {colors.map((color) => (
          <button
            key={color}
            className="h-8 w-8 rounded-full"
            style={{ backgroundColor: color }}
            onClick={() => setColor(color)}
          />
        ))}
      </div>
    </div>
  );
}
