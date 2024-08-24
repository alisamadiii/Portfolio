"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useOnClickOutside } from "usehooks-ts";

import { cn } from "@/utils";

interface Props {
  values: string[];
  credit?: {
    text: string;
    link: string;
  };
}

export default function WhatILearnt({ values, credit }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  const onClickHandler = () => setIsOpen(!isOpen);

  useOnClickOutside(ref, () => setIsOpen(false));

  return (
    <div
      ref={ref}
      className="pointer-events-none fixed right-0 top-0 z-50 flex w-full max-w-md flex-col items-end p-4"
    >
      <button
        className={cn(
          "pointer-events-auto h-8 rounded-lg bg-white px-4 text-black shadow-sm outline-none hover:bg-opacity-90 focus:bg-opacity-90 active:bg-opacity-100",
          isOpen ? "opacity-60" : " "
        )}
        onClick={onClickHandler}
      >
        What I learnt
      </button>

      {isOpen && (
        <motion.ul
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, type: "tween", ease: "easeOut" }}
          className="pointer-events-auto absolute top-full flex max-h-[600px] w-[calc(100%-32px)] list-disc flex-col gap-2 overflow-auto rounded-md bg-white py-4 pl-8 pr-4 shadow-lg"
        >
          {values.map((value, index) => (
            <li key={index} className="pl-4 text-sm text-gray-600">
              <p
                className="text-black"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </li>
          ))}
          {credit && (
            <div className="mt-4 flex justify-end text-xs text-black text-opacity-55">
              <a href={credit.link} target="_blank" className="hover:underline" rel="noreferrer">
                {credit.text}
              </a>
            </div>
          )}
        </motion.ul>
      )}
    </div>
  );
}
