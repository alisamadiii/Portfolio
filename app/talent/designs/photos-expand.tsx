"use client";

import Image from "next/image";
import React, { useState } from "react";
import { motion } from "framer-motion";

const initialValues = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1534996858221-380b92700493?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8ZWFydGh8ZW58MHx8MHx8fDA%3D",
    description: "",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTR8fGVhcnRofGVufDB8fDB8fHww",
    description: "",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1421789665209-c9b2a435e3dc?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTZ8fGVhcnRofGVufDB8fDB8fHww",
    description: "",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjZ8fGVhcnRofGVufDB8fDB8fHww",
    description: "",
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1643330683233-ff2ac89b002c?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzF8fGVhcnRofGVufDB8fDB8fHww",
    description: "",
  },
];

export default function PhotosExpand() {
  const [currentIndex, setCurrentIndex] = useState(0);

  return (
    <div>
      <div className="flex flex-col items-center gap-8 px-4">
        <motion.div
          layoutId={initialValues[currentIndex].id.toString()}
          key={initialValues[currentIndex].id}
          className="aspect-video w-full cursor-pointer overflow-hidden"
          style={{ borderRadius: 12 }}
        >
          <Image
            src={initialValues[currentIndex].url}
            width={1200}
            height={600}
            alt=""
            className="h-full w-full object-cover"
          />
        </motion.div>
        <div className="flex gap-4">
          {initialValues.map(
            (value, index) =>
              index !== currentIndex && (
                <motion.div
                  key={value.id}
                  layoutId={value.id.toString()}
                  className="aspect-video w-24 cursor-pointer overflow-hidden"
                  onClick={() => setCurrentIndex(index)}
                  style={{ borderRadius: 8, opacity: 0.8 }}
                >
                  <Image
                    src={value.url}
                    width={400}
                    height={300}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </motion.div>
              )
          )}
        </div>
      </div>
    </div>
  );
}
