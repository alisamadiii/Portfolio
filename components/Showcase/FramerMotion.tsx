"use client";

import React from "react";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/utils";

const videos = [
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/ios-app-store.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/expanding-list.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/spotify.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/card-animation.mp4",
];

export default function FramerMotionWorks() {
  return (
    <div
      className="relative isolate my-12 flex flex-col items-center justify-center gap-32 py-12 shadow-[0_0_0_100vmax_white]"
      style={{ clipPath: "inset(0 -100vmax)" }}
    >
      <div className="absolute inset-0 -z-10 bg-white"></div>

      <div className="flex flex-col">
        {videos.map((video, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ margin: "-300px" }}
            className={cn("")}
          >
            <video
              src={video}
              autoPlay
              muted
              playsInline
              loop
              className="rounded-xl"
            ></video>
          </motion.div>
        ))}
      </div>

      {/* <HoverCardAnimation />
      <AppleCardExpanding />
      <RabbitAI />
      <MacosHoverClone /> */}

      <Link
        href={"/talent"}
        className="flex h-8 items-center justify-center rounded-lg bg-black px-4 duration-100 hover:bg-opacity-80 active:scale-95"
      >
        See more
      </Link>
    </div>
  );
}
