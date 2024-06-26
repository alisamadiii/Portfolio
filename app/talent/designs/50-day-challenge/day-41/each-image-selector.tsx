import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils";

interface Props {
  id: number;
  url: string;
  selectedImage: number;
  onImageClickHandler: (a: number) => void;
}

export default function EachImageSelector({
  id,
  url,
  selectedImage,
  onImageClickHandler,
}: Props) {
  return (
    <motion.button
      layout
      initial={{ width: 24 }}
      animate={{ width: id === selectedImage ? "auto" : 24 }}
      className={cn("flex h-12", id === selectedImage ? "mx-2" : "")}
      onClick={() => onImageClickHandler(id)}
      style={{ flex: "0 0 auto" }}
      data-id={id}
    >
      <motion.img
        src={url}
        width={100}
        height={200}
        alt=""
        className="h-full w-full object-cover"
      />
    </motion.button>
  );
}
