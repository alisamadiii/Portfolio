"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

import { useToastStore } from "./toast.context";

export default function ToastProvider() {
  const { toastValues } = useToastStore();

  return (
    toastValues && (
      <div className="fixed bottom-4 right-4 flex w-full max-w-md flex-col gap-4 -space-y-8">
        <AnimatePresence mode="popLayout">
          {toastValues.slice(-3).map((value, index) => (
            <motion.div
              layoutId={value.id}
              key={value.id}
              initial={{
                y: index === toastValues.length - 1 ? 100 : 0,
                opacity: 0,
              }}
              animate={{
                y: 0,
                scale:
                  (toastValues.length >= 3 &&
                    (index === 0 ? 0.8 : index === 1 ? 0.9 : 1)) ||
                  1,
                opacity:
                  (toastValues.length >= 3 &&
                    (index === 0 ? 0.3 : index === 1 ? 0.5 : 1)) ||
                  1,
              }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0 }}
              className="relative rounded-md bg-gray-300 px-4 py-6 text-black"
            >
              {value.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    )
  );
}
