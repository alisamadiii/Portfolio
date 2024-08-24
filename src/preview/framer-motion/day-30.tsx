"use client";

import React, { useEffect, useState } from "react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import {
  motion,
  AnimatePresence,
  MotionConfig,
  type Variants,
  useReducedMotion,
} from "framer-motion";

import { Spotlight } from "@/components/Spotlight";
import { cn } from "@/utils";
import useMeasure from "react-use-measure";

interface ValuesTypes {
  id: number;
  img: string;
  name: string;
}

const initialValues: ValuesTypes[] = [
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
];

export default function Day30() {
  const [data, setData] = useState(initialValues);

  const reduceMotion = useReducedMotion();

  const [ref, { height }] = useMeasure();

  return (
    <div className="h-96">
      <Spotlight />
      <div
        className="fixed left-0 top-0 -z-10 h-full w-full"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / .02)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      ></div>

      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <AnimatePresence initial={false}>
          <motion.div
            animate={{
              height: reduceMotion ? "auto" : height > 0 ? height : undefined,
            }}
            className=" overflow-hidden rounded-3xl border border-border bg-background/50 backdrop-blur-md"
          >
            <div
              ref={ref}
              className={cn(
                "flex w-96 flex-col items-start p-4",
                data[0].id === 2 && "items-center"
              )}
            >
              <div
                className={cn(
                  "flex w-full items-center gap-4",
                  data[0].id === 2 && "justify-center"
                )}
              >
                <Avatars data={data} setData={setData} />
                {data[0].id !== 2 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{
                      delay: reduceMotion
                        ? 0
                        : data[0].id === 3 || data[2].id === 3
                          ? 0.3
                          : 0,
                      duration: reduceMotion ? 0 : 0.3,
                    }}
                    className="fade-out-animation grow space-y-2"
                  >
                    <Skeleton className="w-full" />
                    <Skeleton className="h-2 w-full" />
                    <Skeleton className="h-2 w-1/2" />
                  </motion.div>
                ) : null}
              </div>
              {data[0].id === 1 ? (
                <div className="fade-out-animation mt-4 w-full space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : (
                <div className="fade-out-animation mt-4 w-full space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}

function Avatars({
  data,
  setData,
}: {
  data: ValuesTypes[];
  setData: (a: ValuesTypes[]) => void;
}) {
  const [images, setImages] = useState(data);
  const [direction, setDirection] = useState(1); // -1 = left / 1 = right

  const [disabled, setDisabled] = useState(false);

  const reduceMotion = useReducedMotion();

  const onArrowClickHandler = async (action: "back" | "forward") => {
    const contents: NodeListOf<HTMLDivElement> = document.querySelectorAll(
      ".fade-out-animation"
    );

    setDisabled(true);
    const newImages = [...images];

    if (action === "back") {
      let timer = 0;

      const firstItemDelete = newImages.shift();

      if (firstItemDelete) {
        newImages.push(firstItemDelete);
        setDirection(-1);
      }

      if (data[0].id === 1) {
        timer = 300;
      } else if (data[0].id === 2) {
        timer = 400;
      }

      if (reduceMotion) {
        timer = 0;
      }

      contents.forEach((content) => {
        content.style.opacity = "0";
        content.style.transition = "opacity 0.1s ease-out";
      });

      setImages(newImages);

      await new Promise((resolve) =>
        setTimeout(resolve, reduceMotion ? 100 : 300)
      );

      setData(newImages);

      contents.forEach((content) => {
        content.style.opacity = "1";
        content.style.transition = "opacity 0.1s ease-out";
        content.style.transitionDelay = `${timer}ms`;
      });
    } else if (action === "forward") {
      let timer = 0;

      const firstItemDelete = newImages.pop();

      if (firstItemDelete) {
        newImages.unshift(firstItemDelete);
        setDirection(1);
      }

      if (data[2].id === 1) {
        timer = 300;
      } else if (data[2].id === 2) {
        timer = 400;
      }

      if (reduceMotion) {
        timer = 0;
      }

      contents.forEach((content) => {
        content.style.opacity = "0";
        content.style.transition = "opacity 0.1s ease-out";
      });

      setImages(newImages);

      await new Promise((resolve) =>
        setTimeout(resolve, reduceMotion ? 100 : 300)
      );

      setData(newImages);

      contents.forEach((content) => {
        content.style.opacity = "1";
        content.style.transition = "opacity 0.1s ease-out";
        content.style.transitionDelay = `${timer}ms`;
      });
    }
  };

  useEffect(() => {
    if (disabled) {
      setTimeout(() => {
        setDisabled(false);
      }, 400);
    }
  }, [disabled]);

  return (
    <motion.div
      transition={{
        layout: { duration: 0.5, type: "spring", bounce: 0 },
      }}
      className="flex h-auto items-center"
    >
      <motion.button
        layout={!reduceMotion}
        onClick={() => onArrowClickHandler("back")}
        className="z-20 text-2xl disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <IoIosArrowBack />
      </motion.button>
      <div className="avatars-z-index isolate flex">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          {images.map((image, index) => (
            <motion.div
              key={image.id}
              layoutId={reduceMotion ? undefined : image.id.toString()}
              variants={reduceMotion ? reduceMotionVariants : animationVariants}
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
              className={cn("relative isolate", index !== 0 && "ml-[-20px]")}
            >
              <motion.div
                className={cn(
                  "absolute -inset-1 -z-10 rounded-full bg-background",
                  data[0].id === 2 && "-inset-2"
                )}
              />
              <img
                src={image.img}
                className={cn(
                  "pointer-events-none aspect-square w-12 rounded-full object-cover",
                  data[0].id === 2 && "w-24"
                )}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <motion.button
        layout={!reduceMotion}
        onClick={() => onArrowClickHandler("forward")}
        className="z-20 text-2xl disabled:cursor-not-allowed"
        disabled={disabled}
      >
        <IoIosArrowForward />
      </motion.button>
    </motion.div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn(cn("h-4 w-4 rounded-lg bg-box", className))}></div>;
}

const reduceMotionVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
  },
  exit: {
    opacity: 0,
  },
};

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
