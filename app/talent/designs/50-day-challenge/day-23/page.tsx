import React from "react";
import { AnimatePresence, type Variants, motion } from "framer-motion";

import { type panelsType } from ".";
import { directionStore } from "./context";
import { cn } from "@/utils";

interface Props {
  selectedPanel: panelsType;
}

const animations: Variants = {
  hidden: (direction: -1 | 1) => ({
    x: direction === -1 ? "-120%" : "120%",
  }),
  visible: {
    x: 0,
  },
  exit: (direction: -1 | 1) => ({
    x: direction === -1 ? "120%" : "-120%",
  }),
};

export default function Page({ selectedPanel }: Props) {
  const { direction } = directionStore();

  return (
    <div className="px-4">
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          variants={animations}
          custom={direction}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.5, type: "spring", bounce: 0 }}
          key={selectedPanel}
          className="h-96"
        >
          {selectedPanel === "posts"
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="mb-4 flex w-full gap-2">
                  <Skeleton className="rounded-full" />
                  <div className="flex grow flex-col gap-1">
                    <Skeleton className="h-2 w-1/4" />
                    <Skeleton className="h-1 w-full" />
                    <Skeleton className="h-1 w-full" />
                    <Skeleton className="h-1 w-1/4" />
                    <Skeleton className="mt-2 aspect-video h-auto w-full" />
                  </div>
                </div>
              ))
            : selectedPanel === "replies"
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="mb-4 flex w-full gap-2">
                    <Skeleton className="rounded-full" />
                    <div className="flex grow flex-col gap-1">
                      <Skeleton className="h-2 w-1/4" />
                      <Skeleton className="h-1 w-full" />
                      <Skeleton className="h-1 w-full" />
                      <Skeleton className="h-1 w-1/4" />

                      <div className="mt-4 flex gap-2">
                        <Skeleton className="rounded-full" />
                        <div className="flex grow flex-col gap-1">
                          <Skeleton className="h-2 w-1/4" />
                          <Skeleton className="h-1 w-full" />
                          <Skeleton className="h-1 w-full" />
                          <Skeleton className="h-1 w-1/4" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              : selectedPanel === "highlights"
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="mb-4 flex w-full flex-col gap-2"
                    >
                      <Skeleton className="rounded-full" />
                      <div className="mb-4 flex w-full gap-2">
                        <div className="flex grow flex-col gap-1">
                          <Skeleton className="h-2 w-1/4" />
                          <Skeleton className="h-1 w-full" />
                          <Skeleton className="h-1 w-full" />
                          <Skeleton className="h-1 w-1/4" />
                          <Skeleton className="mt-2 aspect-video h-auto w-full" />
                        </div>
                      </div>
                      <Skeleton className="rounded-full" />
                      <div className="flex grow flex-col gap-1">
                        <Skeleton className="aspect-[24/9] h-auto w-full" />
                      </div>
                    </div>
                  ))
                : selectedPanel === "articles"
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="mb-4 flex w-full flex-col gap-2"
                      >
                        <Skeleton className="rounded-full" />
                        <div className="mb-2 flex w-full gap-2">
                          <div className="flex grow flex-col gap-1">
                            <Skeleton className="h-2 w-1/4" />
                            <Skeleton className="h-1 w-full" />
                            <Skeleton className="h-1 w-full" />
                            <Skeleton className="h-1 w-1/4" />
                          </div>
                        </div>
                      </div>
                    ))
                  : selectedPanel === "media"
                    ? Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className="mb-4 flex w-full flex-col gap-2"
                        >
                          <Skeleton className="aspect-[24/9] h-auto w-full" />
                        </div>
                      ))
                    : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("h-8 w-8 rounded-md bg-[#cfcfcf]", className)}></div>
  );
}
