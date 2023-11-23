"use client";

import React from "react";
import Image from "next/image";

interface Props {
  images: string[];
}

export default function Gallery({ images }: Props) {
  return (
    <div className="columns-3 gap-3">
      {images.map((image, index) => (
        <Image
          key={index}
          src={image}
          width={300}
          height={600}
          alt={`image-${index + 1}`}
          className="mb-3 rounded-md"
        />
      ))}
    </div>
  );
}
