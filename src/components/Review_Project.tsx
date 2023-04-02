import React from "react";
import { motion } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import { LinksType } from "@/contents/Links";

type Props = {
  data: LinksType;
  setIsOpen: (a: boolean) => void;
};

export default function Review_Project({ data, setIsOpen }: Props) {
  const closing = (event: any, info: any) => {
    if (info.offset.y > 200) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  };
  return (
    <div className="fixed top-0 left-0 z-50 flex items-end w-full h-full bg-light-blue/50 md:hidden">
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={closing}
        key={1}
        className="w-full py-8 bg-white shadow-xl"
      >
        {data.map((d, index) => {
          const Icons = d.icon;

          return (
            <motion.a
              key={d.id}
              transition={{ delay: index * 0.05 }}
              href={d.href}
              id="link"
              className="flex items-center justify-between px-4 py-4 text-xl font-medium hover:bg-[#EFEFEF] overflow-hidden"
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
    </div>
  );
}
