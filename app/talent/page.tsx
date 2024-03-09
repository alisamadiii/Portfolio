"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Index } from "./designs";
import { create } from "zustand";
import Arrows from "../components/arrows";
import ElementName from "../components/name";

export default function Home() {
  const { currentElement } = useCurrentElementStore();

  const Component = Index[currentElement].component;

  return (
    <main className="fixed left-0 top-0 z-50 flex min-h-screen w-full flex-col items-center justify-center bg-white text-black">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={Index[currentElement].name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex w-full flex-col items-center justify-center"
        >
          <Component />
        </motion.div>
      </AnimatePresence>
      <Arrows />
      <ElementName />
    </main>
  );
}

interface currentElement {
  currentElement: number;
  setCurrentElement: (a: number) => void;
}

export const useCurrentElementStore = create<currentElement>()((set) => ({
  currentElement: 0,
  setCurrentElement: (currentElement) => set({ currentElement }),
}));
