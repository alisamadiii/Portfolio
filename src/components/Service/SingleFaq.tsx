import { FAQ } from "@/contents/Service";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  singleFAQ: FAQ;
  num: number;
  setNum: (a: number) => void;
};

import { AiOutlinePlusCircle } from "react-icons/ai";
import { IoIosArrowDown } from "react-icons/io";

export default function SingleFaq({ singleFAQ, num, setNum }: Props) {
  return (
    <div
      className={`w-full max-w-[700px] p-2 md:p-4 border-b border-light-blue-2 ${
        singleFAQ.answer == "writing" && "opacity-50"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 text-white ${
          singleFAQ.answer == "writing"
            ? "cursor-not-allowed"
            : "cursor-pointer"
        }`}
        onClick={() => {
          if (singleFAQ.id == num) return setNum(0);

          singleFAQ.answer !== "writing" && setNum(singleFAQ.id);
        }}
      >
        <p className="md:text-lg">{singleFAQ.question}</p>
        <div>
          <IoIosArrowDown
            className={`duration-500`}
            style={{
              transform: `rotateX(${singleFAQ.id == num ? "180deg" : "0deg"})`,
            }}
          />
        </div>
      </div>
      <AnimatePresence>
        {num == singleFAQ.id && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden text-white/90"
            dangerouslySetInnerHTML={{ __html: singleFAQ.answer }}
          ></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
