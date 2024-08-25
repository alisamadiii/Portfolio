"use client";

import React, { useEffect, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  type Variants,
  motion,
} from "framer-motion";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

import { cn } from "@/utils";
import Wrapper from "@/components/designs/wrapper";

interface initialTypes {
  id: number;
  img: string;
  name: string;
}

const initialValues: initialTypes[] = [
  {
    id: 1,
    img: "/my-image.jpg",
    name: "Ali",
  },
  {
    id: 2,
    img: "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Ali",
  },
  {
    id: 3,
    img: "https://images.unsplash.com/photo-1567784177951-6fa58317e16b?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjJ8fG1hbnxlbnwwfHwwfHx8MA%3D%3D",
    name: "Ali",
  },
  {
    id: 4,
    img: "https://images.unsplash.com/photo-1481437642641-2f0ae875f836?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    name: "Ali",
  },
];

const animationVariants: Variants = {
  hidden: (direction: 1 | -1) => ({
    x: direction === 1 ? -150 : 150,
    opacity: 0,
  }),
  visible: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: 1 | -1) => ({
    x: direction === 1 ? 150 : -150,
    opacity: 0,
    zIndex: direction === 1 ? -100 : 20,
  }),
};

export default function Day13() {
  const [direction, setDirection] = useState(1); // -1 = left / 1 = right
  const [images, setImages] = useState(initialValues);

  const [disabled, setDisabled] = useState(false);

  const onArrowClickHandler = (action: "back" | "forward") => {
    setDisabled(true);
    const newImages = [...images];

    if (action === "back") {
      const firstItemDelete = newImages.shift();

      if (firstItemDelete) {
        newImages.push(firstItemDelete);
        setDirection(-1);
      }
    } else if (action === "forward") {
      const firstItemDelete = newImages.pop();

      if (firstItemDelete) {
        newImages.unshift(firstItemDelete);
        setDirection(1);
      }
    }

    setImages(newImages);
  };

  useEffect(() => {
    if (disabled) {
      setTimeout(() => {
        setDisabled(false);
      }, 500);
    }
  }, [disabled]);

  return (
    <div className="flex gap-8">
      <button
        onClick={() => onArrowClickHandler("back")}
        className="z-20 text-2xl disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <IoIosArrowBack />
      </button>
      <div className="avatars-z-index isolate flex">
        <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
          <AnimatePresence mode="popLayout" custom={direction} initial={false}>
            {images.slice(0, 3).map((image, index) => (
              <motion.div
                key={image.id}
                layoutId={image.id.toString()}
                variants={animationVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                drag={index === 0 && !disabled ? "x" : undefined}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                whileHover={{ cursor: "grab" }}
                whileDrag={{ cursor: "grabbing" }}
                onDragEnd={(event, info) => {
                  if (info.offset.x < -50) {
                    onArrowClickHandler("back");
                  } else if (info.offset.x > 50) {
                    onArrowClickHandler("forward");
                  }
                }}
                custom={direction}
                className={cn("relative isolate", index !== 0 && "ml-[-100px]")}
              >
                <div className="absolute -inset-3 -z-10 rounded-full bg-white" />
                <img
                  src={image.img}
                  className="pointer-events-none aspect-square w-48 rounded-full object-cover"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </MotionConfig>
      </div>
      <button
        onClick={() => onArrowClickHandler("forward")}
        className="z-20 text-2xl disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <IoIosArrowForward />
      </button>
    </div>
  );
}
