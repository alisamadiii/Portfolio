import React from "react";
import { type day8Types } from ".";

import { AnimatePresence, motion } from "framer-motion";

interface Props {
  value: day8Types;
  selectedTab: day8Types | null;
  setSelectedTab: (a: day8Types | null) => void;
}

export default function EachTab({ value, selectedTab, setSelectedTab }: Props) {
  const onClickHandler = () => setSelectedTab(value);

  return (
    <div className="relative px-2">
      <button
        className="min-w-[200px] rounded-md px-2 py-1 text-start text-sm duration-150 hover:bg-black/5"
        onClick={onClickHandler}
      >
        {value.title}
      </button>

      <AnimatePresence mode="popLayout">
        {selectedTab && selectedTab.id === value.id && (
          <motion.div
            layoutId="day-7-tab-position"
            className="absolute top-[calc(100%+20px)] w-full bg-black p-2 text-white"
            style={{ borderRadius: 8 }}
            //   initial={{ scale: 0.8, filter: "blur(4px)" }}
            //   animate={{ scale: 1, filter: "blur(0px)" }}
          >
            <div>
              <motion.h3
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {value.title}
              </motion.h3>
              <motion.p
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm leading-4 text-white/80"
              >
                {value.description}
              </motion.p>
            </div>

            <div className="h-24 w-full bg-gray-500"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
