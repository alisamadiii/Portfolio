import React from "react";
import { motion } from "framer-motion";

type Props = {
  setIsNotification: (a: boolean) => void;
};

export default function Notification({ setIsNotification }: Props) {
  return (
    <motion.div
      initial={{ y: 300 }}
      animate={{ y: 0 }}
      exit={{ y: 300 }}
      transition={{ type: "tween", duration: 2 }}
      className="fixed flex items-center justify-center gap-4 p-4 rounded-md shadow-xl bottom-4 right-4 bg-light-blue cursor-grab"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 60) setIsNotification(false);
      }}
    >
      <div className="absolute top-0 w-12 h-1 bg-gray-300 rounded-full" />
      <div className="w-4 h-4 rounded-full bg-primary dot_animation" />I am
      currently making a new design for this page
    </motion.div>
  );
}
