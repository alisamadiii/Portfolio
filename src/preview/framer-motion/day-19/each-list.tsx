import React, { useEffect, useState } from "react";
import { type ValuesTypes } from ".";
import { AnimatePresence, motion } from "framer-motion";

import { FaCheck } from "react-icons/fa6";

interface Props {
  value: ValuesTypes;
  selectedValue: number;
  formFocus: boolean;
}

export default function EachList({ value, selectedValue, formFocus }: Props) {
  const [isCopy, setIsCopy] = useState(false);

  useEffect(() => {
    const handleEnterDown = (event: KeyboardEvent) => {
      if (
        value.id === selectedValue &&
        event.key === "Enter" &&
        !isCopy &&
        !formFocus
      ) {
        setIsCopy(true);

        setTimeout(() => setIsCopy(false), 1200);
      }
    };

    window.addEventListener("keydown", handleEnterDown);

    return () => {
      window.removeEventListener("keydown", handleEnterDown);
    };
  }, [selectedValue, isCopy, formFocus]);

  return (
    <li
      key={value.id}
      className="relative isolate flex h-[40px] items-center gap-2 text-sm"
    >
      {value.id === selectedValue && (
        <div className="absolute -inset-x-4 inset-y-0 -z-10 rounded-lg bg-[#ECECEC]" />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        {!isCopy ? (
          <div key={"not-copy"} className="flex grow items-center gap-2">
            <motion.img
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: 0.3, duration: 0.1 },
              }}
              exit={{ opacity: 0 }}
              src={value.icon}
              className="w-6"
            />
            <motion.h4
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { delay: 0.3, duration: 0.1 },
              }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grow origin-left"
            >
              {value.name}
            </motion.h4>
          </div>
        ) : (
          <div key={"copy"} className="flex grow items-center gap-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { delay: 0.3, duration: 0.1 },
              }}
              exit={{ opacity: 0, scale: 0.1 }}
              className="flex w-6 items-center justify-center"
            >
              <FaCheck />
            </motion.span>
            <motion.h4
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: { delay: 0.3, duration: 0.1 },
              }}
              exit={{ opacity: 0 }}
              className="grow"
            >
              Copied
            </motion.h4>
          </div>
        )}
      </AnimatePresence>

      {value.id === selectedValue ? (
        <div className="rounded-md bg-[#E2E2E2] px-2 py-1 text-[#787878]">
          Enter
        </div>
      ) : (
        <p>15 hours ago</p>
      )}
    </li>
  );
}
