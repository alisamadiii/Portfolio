"use client";

import IphoneSimulator from "@/components/iphone-simulator";
import React, { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

interface imagesTypes {
  id: number;
  url: string;
}

const imagesCollections: imagesTypes[] = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1716872491368-cbef5a6b0532?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1716872491368-cbef5a6b0532?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1716872491368-cbef5a6b0532?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 4,
    url: "https://images.unsplash.com/photo-1716872491368-cbef5a6b0532?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    id: 5,
    url: "https://images.unsplash.com/photo-1716872491368-cbef5a6b0532?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

export default function Day13() {
  const [targetImage, setTargetImage] = useState<imagesTypes | null>(null);

  const onImageClickHandler = (value: imagesTypes) => {
    setTargetImage(value);
  };

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#D5D3CA]">
      <IphoneSimulator theme="light">
        <div className="absolute inset-0 -z-10 bg-[#D5D3CA]" />

        <div className="ml-8 mt-4 max-w-24">
          <AnimatePresence mode="popLayout">
            {!targetImage ? (
              <motion.h2
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.4, type: "tween", ease: "easeInOut" }}
                key={"title"}
                className="text-sm font-bold leading-4 text-black"
              >
                Your stamp collections
              </motion.h2>
            ) : (
              <motion.button
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ y: 30, opacity: 0 }}
                transition={{ duration: 0.4, type: "tween", ease: "easeInOut" }}
                key={"button"}
                className="text-sm font-bold leading-4 text-black"
                onClick={() => setTargetImage(null)}
              >
                Go back
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <MotionConfig transition={{ duration: 1, type: "spring", bounce: 0 }}>
          <AnimatePresence initial={false} mode="popLayout">
            {!targetImage && (
              <motion.ul
                key={"images"}
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                className="grid grid-cols-2 gap-2 px-8 pt-8"
              >
                <li>
                  <div className="flex aspect-square items-center justify-center rounded-md bg-white/20 text-black/40">
                    Add
                  </div>
                </li>
                {imagesCollections.map((image) => (
                  <li
                    key={image.id}
                    onClick={() => onImageClickHandler(image)}
                    className="active:opacity-70"
                  >
                    <motion.div className="aspect-square">
                      <motion.img
                        src={image.url}
                        width={400}
                        height={400}
                        alt={image.id.toString()}
                        className="pointer-events-none h-full w-full select-none rounded-md object-cover"
                      />
                    </motion.div>
                  </li>
                ))}
              </motion.ul>
            )}

            {targetImage && (
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                key={"image"}
                className="w-full px-8 pt-40"
              >
                <div className="flex h-48 w-full items-start justify-between rounded-xl bg-white p-4 text-black">
                  <div>Lorem Ipsum</div>
                  <motion.div className="aspect-square w-16">
                    <motion.img
                      src={targetImage.url}
                      width={400}
                      height={400}
                      alt={targetImage.id.toString()}
                      className="pointer-events-none h-full w-full select-none rounded-md object-cover"
                    />
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionConfig>
      </IphoneSimulator>
    </div>
  );
}
