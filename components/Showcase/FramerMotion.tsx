"use client";

import React from "react";

import Link from "next/link";
import { motion } from "framer-motion";

import { cn } from "@/utils";
import { Skeleton } from "../skeleton";

const videos = [
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/ios-app-store.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/expanding-list.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/spotify.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/card-animation.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/card-expand.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/custom-ease.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/dimension.mp4",
  "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/goals/telegram_profile_expanding.mp4",
];

export default function FramerMotionWorks() {
  return (
    <div className="relative isolate flex flex-col items-center justify-center gap-8 py-12">
      <div className="grid grid-cols-2 gap-2">
        {videos.map((video, index) => (
          <motion.div
            key={index}
            className={cn("relative isolate aspect-square w-full")}
          >
            <video
              src={video}
              autoPlay
              muted
              playsInline
              loop
              className="h-full w-full rounded-lg border border-border object-cover"
            ></video>

            <Skeleton className="absolute inset-0 -z-10 rounded-lg" />
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
