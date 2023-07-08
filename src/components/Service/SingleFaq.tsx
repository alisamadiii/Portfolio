import { FAQ } from "@/contents/Service";
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Props = {
  singleFAQ: FAQ;
};

import { AiOutlinePlusCircle, AiOutlineMinusCircle } from "react-icons/ai";

export default function SingleFaq({ singleFAQ }: Props) {
  const [isOpen, setIsOpen] = useState(false);

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
        onClick={() => singleFAQ.answer != "writing" && setIsOpen(!isOpen)}
      >
        <p className="md:text-lg">{singleFAQ.question}</p>
        <div>
          <AiOutlinePlusCircle
            className={`duration-200 ${isOpen && "rotate-45"}`}
          />
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
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
