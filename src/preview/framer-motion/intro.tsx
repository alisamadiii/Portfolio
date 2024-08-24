"use client";

import Link from "next/link";
import React from "react";
import { type Variants, motion } from "framer-motion";

interface Props {
  onClickHandler?: () => void;
}

const introAnimation: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

export default function Intro({ onClickHandler }: Props) {
  return (
    <div className="relative isolate flex min-h-dvh w-full items-center px-4 pb-4 pt-[12rem]">
      <div className="mx-auto w-full max-w-7xl items-center">
        <div className="relative max-w-4xl">
          <motion.h1
            variants={introAnimation}
            initial="hidden"
            animate="visible"
            className="text-4xl font-black tracking-tight lg:text-7xl"
            transition={{ duration: 0.6, type: "tween", ease: "easeInOut" }}
          >
            50 Days Challenge - Framer Motion
          </motion.h1>
          <motion.p
            variants={introAnimation}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              type: "tween",
              ease: "easeInOut",
              delay: 0.2,
            }}
            className="mt-2"
          >
            In these 50 days, I will be trying to master myself in framer
            motion.
          </motion.p>
          <motion.div
            variants={introAnimation}
            initial="hidden"
            animate="visible"
            transition={{
              duration: 0.6,
              type: "tween",
              ease: "easeInOut",
              delay: 0.4,
            }}
          >
            {onClickHandler ? (
              <button
                className="mt-4 flex h-10 w-full items-center justify-center rounded-md bg-black text-white duration-200 hover:bg-opacity-80 active:scale-95 md:w-[200px]"
                onClick={onClickHandler}
              >
                Open
              </button>
            ) : (
              <Link
                href={"/talent/50-day-challenge/day-1"}
                className="mt-4 flex h-10 w-full items-center justify-center rounded-md bg-black text-white duration-200 hover:bg-opacity-80 active:scale-95 md:w-[200px]"
              >
                Start exploring
              </Link>
            )}
          </motion.div>
        </div>
        <div className="flex justify-end md:mt-[-22rem]">
          <div className="grid min-w-[700px] max-w-4xl grid-cols-3 gap-x-1 gap-y-1">
            <div className="aspect-square w-full"></div>
            <div className="aspect-square w-full"></div>
            <motion.div
              variants={introAnimation}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.6,
                type: "tween",
                ease: "easeInOut",
                delay: 0.5,
              }}
              className="aspect-square w-full bg-black/5"
            >
              <video
                src="https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/50-day-framer-motion/1.mp4"
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
              />
            </motion.div>
            <div className="aspect-square w-full"></div>
            <motion.div
              variants={introAnimation}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.6,
                type: "tween",
                ease: "easeInOut",
                delay: 0.6,
              }}
              className="aspect-square w-full bg-black/5"
            >
              <video
                src="https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/50-day-framer-motion/2.mp4"
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
              />
            </motion.div>
            <motion.div
              variants={introAnimation}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.6,
                type: "tween",
                ease: "easeInOut",
                delay: 0.7,
              }}
              className="aspect-square w-full bg-black/5"
            >
              <video
                src="https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/50-day-framer-motion/3.mp4"
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
              />
            </motion.div>
            <motion.div
              variants={introAnimation}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.6,
                type: "tween",
                ease: "easeInOut",
                delay: 0.8,
              }}
              className="aspect-square w-full bg-black/5"
            >
              <video
                src="https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/50-day-framer-motion/4.mp4"
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
              />
            </motion.div>
            <motion.div
              variants={introAnimation}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.6,
                type: "tween",
                ease: "easeInOut",
                delay: 0.9,
              }}
              className="aspect-square w-full bg-black/5"
            >
              <video
                src="https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/50-day-framer-motion/5.mp4"
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
              />
            </motion.div>
            <motion.div
              variants={introAnimation}
              initial="hidden"
              animate="visible"
              transition={{
                duration: 0.6,
                type: "tween",
                ease: "easeInOut",
                delay: 1,
              }}
              className="aspect-square w-full bg-black/5"
            >
              <video
                src="https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/50-day-framer-motion/6.mp4"
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
