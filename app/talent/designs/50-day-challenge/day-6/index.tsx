"use client";

import React, { useState } from "react";
import uniqid from "uniqid";
import EachToast from "./each-toast";
import { AnimatePresence, MotionConfig } from "framer-motion";

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

  console.log(toaster);

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
          <ul className="fixed bottom-4 right-4">
            <AnimatePresence mode="popLayout">
              {toaster.map((value, index) => (
                <EachToast
                  key={value.id}
                  index={index}
                  length={toaster.length}
                  value={value}
                  onDeleteHandler={onDeleteHandler}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </MotionConfig>
    </div>
  );
}
