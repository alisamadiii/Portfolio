import { FAQ } from "@/contents/Service";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  singleFAQ: FAQ;
  num: number;
  setNum: (a: number) => void;
};

import { AiOutlinePlusCircle, AiOutlineMinusCircle } from "react-icons/ai";

export default function SingleFaq({ singleFAQ, num, setNum }: Props) {
  return (
    <div
      className={`w-full max-w-[700px] p-2 md:p-4 border-b border-dark-blue-2 ${
        singleFAQ.answer == "writing" && "opacity-50"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-4 ${
          singleFAQ.answer == "writing"
            ? "cursor-not-allowed"
            : "cursor-pointer"
        }`}
        onClick={() => singleFAQ.answer !== "writing" && setNum(singleFAQ.id)}
      >
        <p className="md:text-lg">{singleFAQ.question}</p>
        <div>
          <AiOutlinePlusCircle
            className={`duration-200 ${num == singleFAQ.id && "rotate-45"}`}
          />
        </div>
      </div>
      <AnimatePresence>
        {num == singleFAQ.id && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
            dangerouslySetInnerHTML={{ __html: singleFAQ.answer }}
          ></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
