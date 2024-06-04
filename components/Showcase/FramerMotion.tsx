"use client";

import React from "react";

import {
  AppleCardExpanding,
  HoverCardAnimation,
  MacosHoverClone,
  RabbitAI,
} from "./Components";
import Link from "next/link";

export default function FramerMotionWorks() {
  return (
    <div
      className="relative isolate my-12 flex flex-col items-center justify-center gap-32 py-12 shadow-[0_0_0_100vmax_white]"
      style={{ clipPath: "inset(0 -100vmax)" }}
    >
      <div className="absolute inset-0 -z-10 bg-white"></div>
      <HoverCardAnimation />
      <AppleCardExpanding />
      <RabbitAI />
      <MacosHoverClone />

      <Link
        href={"/talent"}
        className="flex h-8 items-center justify-center rounded-lg bg-black px-4 duration-100 hover:bg-opacity-80 active:scale-95"
      >
        See more
      </Link>
    </div>
  );
}
