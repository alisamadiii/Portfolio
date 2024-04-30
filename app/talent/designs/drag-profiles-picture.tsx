"use client";

import Image from "next/image";
import React, { useState } from "react";
import { motion } from "framer-motion";

const initialValues = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8dXNlciUyMG1hbnxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1557862921-37829c790f19?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlciUyMG1hbnxlbnwwfHwwfHx8MA%3D%3D",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OHx8dXNlciUyMG1hbnxlbnwwfHwwfHx8MA%3D%3D",
  },
];

export default function DragProfilesPicture() {
  const [values, setValues] = useState(initialValues);

  const onDragHandler = (actions: "forward" | "backward") => {
    if (actions === "forward") {
      const updateItems = [...values];
      const firstUser = updateItems.shift();

      if (firstUser) {
        updateItems.push(firstUser);
      }

      setValues(updateItems);
    } else {
      const updateItems = [...values];
      const firstUser = updateItems.pop();

      if (firstUser) {
        updateItems.unshift(firstUser);
      }

      setValues(updateItems);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex -space-x-12 md:-space-x-32">
        {values.map((value, index) => (
          <motion.div
            layoutId={value.id.toString()}
            key={value.id}
            drag={index === 0 ? "x" : undefined}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(event, info) => {
              if (info.offset.x > 200) {
                onDragHandler("backward");
              } else if (info.offset.x < 200) {
                onDragHandler("forward");
              }
            }}
            whileDrag={{ cursor: "grabbing" }}
            className="relative isolate h-24 w-24 first-of-type:z-20 last-of-type:-z-10 md:h-48 md:w-48"
          >
            <Image
              src={value.url}
              width={300}
              height={300}
              alt=""
              className="pointer-events-none h-full w-full rounded-full object-cover"
            />
            <div className="absolute -inset-2 -z-10 rounded-full bg-white"></div>
          </motion.div>
        ))}
      </div>
      <p className="mt-12 px-4 text-center text-sm text-gray-700">
        Drag the first picture to the left and right.
      </p>
    </div>
  );
}
