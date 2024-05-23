"use client";

import React, { useState } from "react";
import uniqid from "uniqid";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

export interface ToasterTypes {
  id: string;
  title: string;
  description: string;
}

export default function Day6() {
  const [toaster, setToaster] = useState<null | ToasterTypes[]>(null);

  const onClickHandler = (title: string, description: string) => {
    const toasters = toaster ? [...toaster] : [];

    toasters.push({ id: uniqid(), title, description });

    setToaster(toasters);
  };

  const onDeleteHandler = (id: string) => {
    const filterToasters = toaster?.filter((value) => value.id !== id);

    if (filterToasters) {
      setToaster(filterToasters);
    }
  };

  return (
    <div>
      <button
        className="h-8 rounded-md bg-black px-6 text-white"
        onClick={() =>
          onClickHandler("Toaster", "This is a custom build toaster.")
        }
      >
        Toaster
      </button>

      <MotionConfig transition={{ duration: 0.6, type: "spring", bounce: 0 }}>
        {toaster && (
          <motion.ul className="fixed bottom-4 right-4 w-[356px]">
            <AnimatePresence mode="popLayout">
              {toaster.map((value, index) => (
                <motion.li
                  layout
                  key={value.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{
                    opacity: toaster.length - 1 - index > 2 ? 0 : 1,
                    y: 0,
                    scale: 1 - (toaster.length - 1 - index) * 0.1,
                  }}
                  exit={{ y: 40, opacity: 0 }}
                  className={`relative flex w-[356px] flex-col justify-center rounded-lg border border-[hsl(0,0%,93%)] bg-white  p-4 shadow-[0_4px_12px_#0000001a] ${index !== toaster.length - 1 && "mb-[-60px]"}`}
                >
                  <div className="flex justify-between">
                    <p>{value.title}</p>
                    <button
                      className="flex h-6 w-6 items-center justify-center"
                      onClick={() => onDeleteHandler(value.id)}
                    >
                      X
                    </button>
                  </div>
                  <small>
                    {value.description} - {value.id}
                  </small>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </MotionConfig>
    </div>
  );
}
