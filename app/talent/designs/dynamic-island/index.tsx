"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

import Wrapper from "@/components/designs/wrapper";
import Ring from "./Ring";

export default function DynamicIsland() {
  const [view, setView] = useState<"idle" | "ring">("idle");

  return (
    <Wrapper className="space-y-9">
      <motion.div
        layout
        className="min-w-[100px] scale-150 overflow-hidden bg-black"
        style={{ borderRadius: 9999 }}
      >
        {view === "idle" ? (
          <div className="h-7"></div>
        ) : view === "ring" ? (
          <Ring />
        ) : null}
      </motion.div>
      <div className="flex justify-center gap-4">
        <button
          type="button"
          className="h-10 w-32 rounded-full bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          onClick={() => setView("idle")}
        >
          Idle
        </button>
        <button
          type="button"
          className="h-10 w-32 rounded-full bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          onClick={() => setView("ring")}
        >
          Ring
        </button>
      </div>
    </Wrapper>
  );
}
