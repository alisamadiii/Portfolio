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
    <div className="relative isolate my-12 flex flex-col items-center justify-center gap-8 py-12">
      <div className="grid grid-cols-2 gap-2">
        {videos.map((video, index) => (
          <motion.div key={index} className={cn("")}>
            <video
              src={video}
              autoPlay
              muted
              playsInline
              loop
              className="rounded-lg border border-border"
            ></video>
          </motion.div>
        ))}
      </div>

      <Link
        href={"/talent"}
        className="flex h-8 items-center justify-center rounded-lg bg-white px-4 text-black duration-100 hover:bg-opacity-80 active:scale-95"
      >
        See more
      </Link>
    </div>
  );
}
