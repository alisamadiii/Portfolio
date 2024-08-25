"use client";

import React, { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import Image from "next/image";

import { cn } from "@/utils";

const initialValues = [
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

export default function Day5() {
  const [isExpand, setIsExpand] = useState(false);

  const onClickHandler = () => [setIsExpand(!isExpand)];

  return (
    <div className="h-[350px]">
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="flex w-80 items-center justify-between px-4"
          onClick={onClickHandler}
        >
          <span className="flex items-center gap-1">
            Pending{" "}
            <span className="text-black/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 16 16"
              >
                <g clipPath="url(#clip0_271_19166)">
                  <path
                    d="M8 10.6667V8.00004M8 5.33337H8.00666M14.6667 8.00004C14.6667 11.6819 11.6819 14.6667 8 14.6667C4.3181 14.6667 1.33333 11.6819 1.33333 8.00004C1.33333 4.31814 4.3181 1.33337 8 1.33337C11.6819 1.33337 14.6667 4.31814 14.6667 8.00004Z"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    stroke="currentColor"
                  ></path>
                </g>
                <defs>
                  <clipPath id="clip0_271_19166">
                    <rect width="16" height="16" fill="white"></rect>
                  </clipPath>
                </defs>
              </svg>
            </span>
          </span>
          <span className="flex items-center gap-1">
            4{" "}
            <motion.span
              initial={{ rotate: 0 }}
              animate={{ rotate: isExpand ? 180 : 0 }}
              className="text-black/50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
              >
                <path
                  d="M5 7.5L10 12.5L15 7.5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  stroke="currentColor"
                ></path>
              </svg>
            </motion.span>
          </span>
        </motion.button>

        <div className="avatars-z-index mt-4 flex w-80 flex-col gap-2 px-4">
          {initialValues.map((value, index) => (
            <motion.div
              key={value.id}
              className={cn(
                "flex h-16 w-full items-center gap-4 rounded-lg border bg-[#f4f4f4] px-2"
              )}
              initial={{
                marginTop: index !== 0 ? "-65px" : "0",
                scale: index !== 0 ? 1 - index * 0.05 : 1,
                opacity: index >= 3 ? 0 : 1,
              }}
              animate={{
                marginTop: index !== 0 ? (isExpand ? "0" : "-65px") : "0",
                scale: index !== 0 ? (isExpand ? 1 : 1 - index * 0.05) : 1,
                opacity: index >= 3 ? (isExpand ? 1 : 0) : 1,
              }}
            >
              <Image
                src={value.img}
                width={48}
                height={48}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />

              <div className="flex grow items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="">{value.name}</h3>
                  <small className="-mt-0.5 inline-block text-xs text-black/50">
                    Web Developer
                  </small>
                </div>
                <h4 className="text-2xl text-black/20">$40</h4>
              </div>
            </motion.div>
          ))}
        </div>
      </MotionConfig>
    </div>
  );
}
