"use client";

import Image from "next/image";
import React, { useState } from "react";
import { LayoutGroup, MotionConfig, motion } from "framer-motion";

import SideContent from "./side-content";

const initialValues = [
  {
    id: 1,
    url: "https://plus.unsplash.com/premium_photo-1675827055620-24d540e0892a?q=80&w=3072&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?q=80&w=3070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1455218873509-8097305ee378?q=80&w=3648&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?q=80&w=2200&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

export default function Day25() {
  const [currentStory, setCurrentStory] = useState(1);
  // const [remainingTime, setRemainingTime] = useState(2000);

  const middleStory = initialValues.find((value) => value.id === currentStory);

  // const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  // const startTimeRef = useRef<number | null>(null);

  // const cycleStories = () => {
  //   setCurrentStory((prevStory) =>
  //     prevStory >= initialValues.length ? 1 : prevStory + 1
  //   );
  //   setRemainingTime(2000); // Reset remaining time for the next story
  // };

  // useEffect(() => {
  //   if (!isStop) {
  //     const handleResume = () => {
  //       startTimeRef.current = Date.now();
  //       timeoutIdRef.current = setTimeout(() => {
  //         cycleStories();
  //         startTimeRef.current = Date.now();
  //         timeoutIdRef.current = setInterval(cycleStories, 2000);
  //       }, remainingTime);
  //     };

  //     handleResume();

  //     return () => {
  //       if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
  //     };
  //   } else {
  //     if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
  //     if (startTimeRef.current) {
  //       const elapsedTime = Date.now() - startTimeRef.current;
  //       setRemainingTime((prev) => prev - elapsedTime);
  //     }
  //   }
  // }, [isStop]);

  return (
    <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-[#1A1A1A]">
      <MotionConfig transition={{ duration: 0.7, type: "spring", bounce: 0 }}>
        <LayoutGroup>
          <SideContent
            values={initialValues}
            position="left"
            currentStory={currentStory}
            setCurrentStory={setCurrentStory}
          />

          <div
            id="middle-story"
            className="aspect-[9/16] h-[70dvh] md:h-[95dvh]"
          >
            {middleStory ? (
              <motion.div
                key={middleStory.id}
                layoutId={middleStory.id.toString()}
                className="relative h-full overflow-hidden"
                style={{ borderRadius: 12 }}
              >
                <Image
                  src={middleStory.url}
                  width={600}
                  height={800}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </motion.div>
            ) : null}
          </div>

          <SideContent
            values={initialValues}
            position="right"
            currentStory={currentStory}
            setCurrentStory={setCurrentStory}
          />
        </LayoutGroup>
      </MotionConfig>
    </div>
  );
}
