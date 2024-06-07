import React, { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import type { valuesTypes } from ".";
import { cn } from "@/utils";
import Image from "next/image";

interface Props {
  value: valuesTypes;
}

export default function EachValue({ value }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
      <li className="grid grid-cols-3 gap-4">
        <div className="pt-2">
          <h3 className="text-sm font-medium">{value.title}</h3>
          <p className="mt-1 max-w-[250px] text-xs leading-4 text-[#A5A5A5]">
            {value.description}
          </p>
        </div>
        <motion.div
          className={cn(
            "isolate col-span-2 cursor-pointer",
            isOpen
              ? "absolute left-0 top-0 h-full max-h-dvh w-full px-4 pt-16"
              : "hover:opacity-90 active:scale-95"
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 -z-10 bg-black/50 backdrop-blur-xl"
              />
            )}
          </AnimatePresence>

          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-3 flex items-center justify-between text-white"
            >
              <div className="flex items-center gap-2">
                <Image
                  src={
                    "https://ldxedhzbfnmrovkzozxc.supabase.co/storage/v1/object/public/general/profile-image-day-22.jpg"
                  }
                  width={20}
                  height={20}
                  alt=""
                  className="aspect-square h-5 w-5 rounded-full object-cover"
                />
                <h4 className="text-xs">Ali Reza Samadi</h4>
              </div>
              <small className="text-xs text-[#A5A5A5]">12 days ago</small>
            </motion.div>
          )}

          <motion.video
            layout
            src={value.videoUrl}
            autoPlay
            muted
            playsInline
            loop
            className="rounded-md"
          />

          {isOpen && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="paragraph-fade-end mt-3 text-start text-sm text-white"
            >
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Odit
              voluptate maxime laborum iste facere adipisci laudantium. Quas,
              possimus Lorem ipsum dolor sit amet consectetur, adipisicing elit.
              Dolorem vel nisi, cupiditate a, perferendis, laudantium commodi
              possimus distinctio aperiam tempore debitis magni voluptates?
              Earum, qui aut tenetur id libero accusantium. Lorem ipsum dolor
              sit, amet consectetur adipisicing elit. Accusantium possimus a
              cupiditate repellat veritatis iusto ad distinctio fuga nulla,
              inventore sit vitae sint pariatur culpa nostrum eos ipsa neque.
              Doloremque!
            </motion.p>
          )}
        </motion.div>
      </li>
    </MotionConfig>
  );
}
