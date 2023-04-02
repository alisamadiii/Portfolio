import React from "react";
import { Variants, motion } from "framer-motion";

import { LinksType } from "@/contents/Links";

type Props = {
  className?: string;
  data: LinksType;
};

import { FiArrowUpRight } from "react-icons/fi";

const DropDown_List_Variants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const Links_Variants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

export default function DropDown_List({ className, data }: Props) {
  return (
    <motion.div
      variants={DropDown_List_Variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`${className} bg-white rounded-xl shadow-container py-2 flex flex-col`}
    >
      {data.map((d, index) => {
        const Icons = d.icon;

        return (
          <motion.a
            key={d.id}
            variants={Links_Variants}
            transition={{ delay: index * 0.05 }}
            href={d.href}
            id="link"
            className="flex items-center justify-between px-4 py-2 text-sm font-medium hover:bg-[#EFEFEF] overflow-hidden"
          >
            <span className="flex items-center gap-2">
              <Icons />
              {d.name}
            </span>
            <span>
              <FiArrowUpRight />
            </span>
          </motion.a>
        );
      })}
    </motion.div>
  );
}
