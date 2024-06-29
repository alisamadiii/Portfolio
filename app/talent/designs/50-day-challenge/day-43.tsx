"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";

export default function Day43() {
  return (
    <div className="w-full">
      <div className="flex h-dvh w-full flex-col items-center justify-center bg-box">
        <h1 className="text-4xl font-medium">Scroll down</h1>
      </div>
      <MiddleContent />
      <div className="flex h-dvh w-full flex-col items-center justify-center bg-box">
        <h1 className="text-4xl font-medium">Scroll up</h1>
      </div>
    </div>
  );
}

const images = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=3072&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?q=80&w=2432&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1512497877076-c1cf69c4dd5c?q=80&w=3731&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1512515472878-53fc91c7d6ab?q=80&w=3731&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=80&w=3570&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 6,
    url: "https://images.unsplash.com/photo-1508265802264-937da5e9cc81?q=80&w=3687&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 7,
    url: "https://images.unsplash.com/photo-1518562180175-34a163b1a9a6?q=80&w=3570&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 8,
    url: "https://images.unsplash.com/photo-1505159940484-eb2b9f2588e2?q=80&w=3570&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

function MiddleContent() {
  const [selectedImage, setSelectedImage] = useState(0);

  const [scrollWidth, setScrollWidth] = useState(0);

  const container = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({ target: container });

  const xValue = useTransform(scrollYProgress, [0, 1], [0, -scrollWidth]);
  const x = useSpring(xValue, { bounce: 0 });

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;

    if (scrollContainer) {
      const { width } = scrollContainer.getBoundingClientRect();
      const scrollWidth = scrollContainer.scrollWidth;

      if (scrollWidth) {
        setScrollWidth(scrollWidth - width);
      }
    }
  }, []);

  const onClickHandler = (value: number) => {
    if (selectedImage === 0) {
      setSelectedImage(value);
      return;
    }

    if (value === selectedImage) {
      setSelectedImage(0);
      return;
    }

    setSelectedImage(value);
  };

  console.log(selectedImage);

  return (
    <div ref={container} className="h-[300dvh] w-full bg-background">
      <div className="sticky top-0 mx-auto flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-white text-black">
        <h2 className="mb-8 w-full max-w-7xl text-3xl font-bold">
          Nature Images
        </h2>
        <div className="relative w-full">
          <div className="absolute left-0 top-0 z-20 h-[110%] w-48 bg-gradient-to-l from-transparent to-white/50"></div>

          <motion.div
            ref={scrollContainerRef}
            style={{ x }}
            className="mx-auto flex max-w-7xl items-center gap-2"
          >
            {images.map((image) => (
              <motion.button
                key={image.id}
                className={`aspect-square w-96`}
                style={{ flex: "0 0 auto" }}
                onClick={() => onClickHandler(image.id)}
              >
                <Image
                  src={image.url}
                  width={800}
                  height={800}
                  alt=""
                  className="pointer-events-none h-full w-full object-cover"
                />
              </motion.button>
            ))}
          </motion.div>

          <div className="absolute right-0 top-0 z-20 h-[110%] w-48 bg-gradient-to-r from-transparent to-white/50"></div>
        </div>
      </div>
    </div>
  );
}
