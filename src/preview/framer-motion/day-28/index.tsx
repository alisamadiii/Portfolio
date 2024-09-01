"use client";

import Image from "next/image";
import React, { useState } from "react";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { AnimatePresence, motion } from "framer-motion";

import Hr from "@/components/hr";

const comments = [
  {
    id: 1,
    name: "Mike",
    comment:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Labore incidunt doloremque necessitatibus nobis voluptatibus velit minus voluptate. Corporis dolorem, quas laborum vero quam est nobis sit commodi cumque quis libero.",
    avatar:
      "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/profile-image-day-22.jpg",
  },
  {
    id: 2,
    name: "Mike",
    comment:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Labore incidunt doloremque necessitatibus nobis voluptatibus velit minus voluptate. Corporis dolorem, quas laborum vero quam est nobis sit commodi cumque quis libero.",
    avatar:
      "https://pbs.twimg.com/profile_images/1796933077891231745/SQCEp_jD_400x400.jpg",
  },
  {
    id: 3,
    name: "Mike",
    comment:
      "Lorem ipsum, dolor sit amet consectetur adipisicing elit. Labore incidunt doloremque necessitatibus nobis voluptatibus velit minus voluptate. Corporis dolorem, quas laborum vero quam est nobis sit commodi cumque quis libero.",
    avatar:
      "https://pbs.twimg.com/profile_images/1774123575248830466/e0rbeSop_400x400.jpg",
  },
];

export default function Day28() {
  const [show, setShow] = useState(false);

  const onMouseEnter = () => setShow(true);
  const onMouseLeave = () => setShow(false);

  return (
    <div
      className="w-96 rounded-3xl bg-white p-4 shadow-[0_5px_10px_rgba(0,0,0,.07)]"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Top */}
      <div>
        <header className="flex justify-between">
          <div className="flex gap-2">
            <div className="rounded-md bg-[#EFF5F9] px-2 py-1 text-sm font-medium text-[#354555]">
              Strategy
            </div>
            <div className="rounded-md bg-[#E5F0DF] px-2 py-1 text-sm font-medium text-[#83A06E]">
              Low
            </div>
          </div>
          <button className="text-2xl text-[#E1E1E1]">
            <HiOutlineDotsHorizontal />
          </button>
        </header>
        <h1 className="mb-1 mt-4 text-xl font-medium tracking-tight">
          Budget draft
        </h1>

        <small className="text-[#CFD1D7]">6 new replies</small>
      </div>
      {/* Middle */}
      <AnimatePresence initial={false}>
        {show && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{
              type: "tween",
              ease: [0.83, 0, 0.17, 1],
              duration: 0.6, // although duration for spring is not typical, you can adjust the stiffness and damping
            }}
            className="overflow-hidden"
          >
            <motion.ul className="my-4 flex flex-col gap-2">
              {comments.map((comment, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, y: -40 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      delay: 0.05 * index + 0.3,
                      type: "spring",
                      stiffness: 150, // Lower stiffness for a longer duration
                      damping: 15, // Adjust damping for smoother animation
                    },
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    transition: { duration: 1, opacity: { delay: 0.1 } },
                  }}
                  className={`rounded-xl border border-[#e9ebee] p-3 ${index === 0 ? "origin-bottom" : index === 1 ? "origin-center" : "origin-top"}`}
                >
                  <div className="flex items-center gap-2">
                    <Image
                      src={comment.avatar}
                      width={80}
                      height={80}
                      alt={comment.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                    <h2 className="grow">{comment.name}</h2>
                    <small className="text-[#CFD1D7]">55 minutes ago</small>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm text-[#CFD1D7]">
                    {comment.comment}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Bottom */}
      <div className="mt-8 flex items-end justify-between gap-3">
        <div className="flex -space-x-2">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-full shadow-[0_0_0_3px_white]"
            >
              <Image
                src={comment.avatar}
                width={80}
                height={80}
                alt={comment.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            </div>
          ))}
        </div>
        <Hr className="my-0 w-auto grow -translate-y-1 bg-[#e9ebee]" />
        <small className="self-end text-[#CFD1D7]">edited 6 minutes ago</small>
      </div>
    </div>
  );
}
