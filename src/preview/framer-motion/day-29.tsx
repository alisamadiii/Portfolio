"use client";

import React, { useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  type Variants,
  motion,
  useReducedMotion,
} from "framer-motion";

import { FaArrowDown, FaCloud } from "react-icons/fa";
import { HiOutlineDotsVertical } from "react-icons/hi";

export default function Day29() {
  const [nextPage, setNextPage] = useState(false);
  const [disable, setDisable] = useState(false);

  const reduceMotion = useReducedMotion();

  const onClickHandler = () => {
    setDisable(true);
    setNextPage(!nextPage);

    setTimeout(
      () => {
        setDisable(false);
      },
      reduceMotion ? 300 : 1000
    );
  };

  return (
    <div className="flex h-dvh w-full items-center justify-center bg-[#080808] p-8">
      <div className="w-96 overflow-hidden rounded-3xl bg-[#171717]">
        <MotionConfig
          transition={
            reduceMotion
              ? { type: "tween", duration: 0.3 }
              : { duration: 1, type: "spring", bounce: 0 }
          }
        >
          {/* top */}
          <div className="relative flex h-52 items-center justify-center overflow-hidden">
            <div className={`absolute top-0 translate-y-10`}>
              {["#00CC46", "#FCBA08", "#0EB2FF"].map((value, index) => (
                <motion.div
                  layout={!reduceMotion}
                  key={value}
                  animate={{
                    scale: !nextPage ? 0.75 + (index * 0.25) / (3 - 1) : 1,
                  }}
                  className={`relative flex h-96 w-60 gap-4 rounded-3xl p-4  ${index > 0 && !nextPage ? "mt-[-350px]" : ""}`}
                  style={{ background: value }}
                >
                  <div className="h-10 w-10 rounded-full bg-white/30"></div>
                  <div className="h-4 grow translate-y-2 rounded-full bg-white/30"></div>
                </motion.div>
              ))}
            </div>
          </div>
          {/* bottom */}
          <div className="flex flex-col items-center justify-center bg-[#101010] p-8">
            <h2 className="text-2xl font-medium">Add an Existing Wallet</h2>
            <p className="mt-2 text-center font-light text-[#8B8B8B]">
              Continue using a wallet you already own or track of any address.
            </p>

            <div className="relative flex flex-col gap-4 overflow-hidden pt-8">
              <AnimatePresence
                initial={false}
                mode={reduceMotion ? "wait" : "popLayout"}
              >
                {!nextPage ? (
                  <motion.div
                    key={"1"}
                    variants={
                      reduceMotion ? reduceMotionVariants : animationVariants
                    }
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={"bottom"}
                  >
                    <button
                      className="mb-4 flex gap-4 rounded-3xl bg-[#171717] p-5 text-start disabled:opacity-100"
                      onClick={onClickHandler}
                      disabled={disable}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#32C75D]"
                        style={{ flex: "0 0 auto" }}
                      >
                        <FaArrowDown />
                      </div>
                      <div className="">
                        <h3>Import</h3>
                        <p className="text-sm text-[#8D8D8D]">
                          Add an existing wallet via a Secret Phrase or Private
                          Key.
                        </p>
                      </div>
                      <div className="self-center text-xl text-[#8D8D8D]">
                        <HiOutlineDotsVertical />
                      </div>
                    </button>
                    <button className="mb-4 flex gap-4 rounded-3xl bg-[#171717] p-5 text-start">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500"
                        style={{ flex: "0 0 auto" }}
                      >
                        <FaCloud />
                      </div>
                      <div className="">
                        <h3>Nothing to Restore</h3>
                        <p className="text-sm text-[#8D8D8D]">
                          Add an existing wallet via a Secret Phrase or Private
                          Key.
                        </p>
                      </div>
                      <div className="self-center text-xl text-[#8D8D8D]">
                        <HiOutlineDotsVertical />
                      </div>
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={"2"}
                    variants={
                      reduceMotion ? reduceMotionVariants : animationVariants
                    }
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    custom={"top"}
                  >
                    <button
                      className="mb-4 flex gap-4 rounded-3xl bg-[#171717] p-5 text-start disabled:opacity-100"
                      onClick={onClickHandler}
                      disabled={disable}
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500"
                        style={{ flex: "0 0 auto" }}
                      >
                        <FaArrowDown />
                      </div>
                      <div className="">
                        <h3>Import</h3>
                        <p className="text-sm text-[#8D8D8D]">
                          Add an existing wallet via a Secret Phrase or Private
                          Key.
                        </p>
                      </div>
                      <div className="self-center text-xl text-[#8D8D8D]">
                        <HiOutlineDotsVertical />
                      </div>
                    </button>
                    <button className="mb-4 flex gap-4 rounded-3xl bg-[#171717] p-5 text-start">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500"
                        style={{ flex: "0 0 auto" }}
                      >
                        <FaCloud />
                      </div>
                      <div className="">
                        <h3>Nothing to Restore</h3>
                        <p className="text-sm text-[#8D8D8D]">
                          Add an existing wallet via a Secret Phrase or Private
                          Key.
                        </p>
                      </div>
                      <div className="self-center text-xl text-[#8D8D8D]">
                        <HiOutlineDotsVertical />
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </MotionConfig>
      </div>
    </div>
  );
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
  hidden: (direction) => ({
    y: direction === "top" ? "-100%" : "100%",
    opacity: 0,
  }),
  visible: {
    y: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    y: direction === "top" ? "-100%" : "100%",
    opacity: 0,
  }),
};
