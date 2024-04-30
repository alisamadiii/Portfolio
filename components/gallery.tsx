"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

import { useImagePreviewModal } from "@/hooks/useModals";

interface Props {
  images: string[];
  columns?: number;
}

export default function Gallery({ images, columns = 3 }: Props) {
  const { setImage } = useImagePreviewModal();

  const onClickHandler = (value: string) => {
    setImage(value);
  };

  return (
    <div className={`gap-3 ${columns === 2 ? "columns-2" : "columns-3"}`}>
      {images.map((image, index) => (
        <motion.div layoutId={image} key={index}>
          <Image
            src={image}
            width={300}
            height={600}
            alt={`image-${index + 1}`}
            className={`mb-3 cursor-pointer rounded-md`}
            onClick={() => onClickHandler(image)}
          />
        </motion.div>
      ))}
    </div>
  );
}
