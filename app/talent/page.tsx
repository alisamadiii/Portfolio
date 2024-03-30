"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Index } from "./designs";
import Arrows from "../components/arrows";
import ElementName from "../components/name";
import { useSearchParams } from "next/navigation";

export default function Home() {
  const searchParams = useSearchParams();

  const Component = Index.find(
    (value) => value.id === Number(searchParams.get("design"))
  );

  return (
    <main className="fixed left-0 top-0 z-50 flex min-h-screen w-full flex-col items-center justify-center bg-white text-black">
      {Component ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={Component.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="flex w-full flex-col items-center justify-center"
          >
            <Component.component />
          </motion.div>
        </AnimatePresence>
      ) : (
        <div>Not Found</div>
      )}
      <Arrows key={Component?.id} />
      <ElementName
        id={Component?.id || 0}
        name={Component?.name.replaceAll("-", " ") || "Not found"}
      />
    </main>
  );
}
