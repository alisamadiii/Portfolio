import React from "react";
import { Variants, motion } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import { LinksType } from "@/contents/Links";

type Props = {
  data: LinksType;
  setIsOpen: (a: boolean) => void;
};

const BackgroundVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};
const ListVariants: Variants = {
  hidden: { y: 1000 },
  visible: { y: 0, transition: { type: "tween", duration: 0.4 } },
  exit: { y: 1000, transition: { duration: 1 } },
};

export default function Review_Project({ data, setIsOpen }: Props) {
  const closing = (event: any, info: any) => {
    info.offset.y > 200 ? setIsOpen(false) : setIsOpen(true);
  };
  return (
    <div className="fixed top-0 left-0 z-50 flex items-end w-full h-full md:hidden isolate">
      <motion.div
        variants={BackgroundVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="absolute top-0 left-0 w-full h-full bg-light-blue/50 -z-10"
        onClick={() => setIsOpen(false)}
      ></motion.div>
      <motion.div
        variants={ListVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        onDragEnd={closing}
        className="relative w-full py-8 bg-white shadow-xl"
      >
        <div className="absolute w-16 h-2 -translate-x-1/2 rounded-full bg-gray-200/70 top-4 left-1/2"></div>
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
