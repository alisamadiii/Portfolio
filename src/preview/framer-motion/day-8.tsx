"use client";

import React, { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import LoadingSpinner from "@/components/loading-spinner";

export default function Day8() {
  const [isOpen, setIsOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onClickHandler = () => setIsOpen(!isOpen);

  const onSubmitHandler = async () => {
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    setIsSubmitting(false);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsOpen(false);
  };

  return (
    <div className="px-4">
      <button
        className="mt-8 flex h-10 w-full items-center justify-center rounded-md bg-black text-white duration-200 hover:bg-opacity-80 active:scale-95 md:w-[200px]"
        onClick={onClickHandler}
      >
        Drawer
      </button>

      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <AnimatePresence>
          {isOpen && (
            <div className="fixed left-0 top-0 flex h-full w-full justify-end p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 -z-10 bg-white/50 backdrop-blur-2xl"
                onClick={onClickHandler}
              />
              <motion.div
                initial={{ x: "120%" }}
                animate={{ x: "0" }}
                exit={{ x: "120%" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.1, right: 0.5 }}
                onDragEnd={(event, info) => {
                  if (info.offset.x >= 200) {
                    setIsOpen(false);
                  }
                }}
                className="relative flex h-full w-96 flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-[0_0_20px_rgba(0,0,0,.15)]"
              >
                <h2 className="text-lg font-bold">Lorem Ipsum</h2>
                <p className="text-sm text-black/70">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Obcaecati quidem rerum accusantium. Eligendi unde eius minima
                  iusto neque, inventore rem asperiores odit dignissimos
                  consequatur at voluptate qui, repellat laborum nesciunt.
                </p>

                <input
                  type="text"
                  className="mt-8 w-full rounded-t-lg border px-3 py-2 outline-none duration-100 focus:border-black"
                  placeholder="Username"
                />
                <input
                  type="text"
                  className="mt-1 w-full border px-3 py-2 outline-none duration-100 focus:border-black"
                  placeholder="Password"
                />
                <input
                  type="text"
                  className="mt-1 w-full rounded-b-lg border px-3 py-2 outline-none duration-100 focus:border-black"
                  placeholder="Confirm password"
                />

                <button
                  className="mt-4 flex h-10 w-full items-center justify-center rounded-md bg-black text-white duration-200 hover:bg-opacity-80 active:scale-95"
                  onClick={onSubmitHandler}
                >
                  Submit
                </button>

                <p className="mt-auto px-8 text-center text-xs text-black/40">
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Obcaecati quidem rerum accusantium. Eligendi unde eius minima
                  iusto neque.
                </p>

                <AnimatePresence>
                  {isSubmitting && (
                    <motion.div
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 40 }}
                      className="absolute inset-0 bg-white/40 backdrop-blur-sm"
                    >
                      <LoadingSpinner />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </MotionConfig>
    </div>
  );
}
