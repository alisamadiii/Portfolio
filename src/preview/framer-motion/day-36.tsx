"use client";

import React, { Fragment, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { IoIosArrowDropdownCircle } from "react-icons/io";
import { MdKeyboardArrowRight } from "react-icons/md";

import { GrNotification } from "react-icons/gr";
import Hr from "@/components/hr";
import useMeasure from "react-use-measure";

export default function Day36() {
  const [isOpen, setIsOpen] = useState(false);

  const [ref, { height }] = useMeasure();

  const onClickHandler = () => setIsOpen(!isOpen);

  return (
    <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0.05 }}>
      <motion.div
        animate={{ height }}
        className="overflow-hidden rounded-xl border border-[#EEEEEE] bg-white shadow-[0_2px_10px_rgba(0,0,0,.05)]"
      >
        <div ref={ref} className="relative flex w-[340px] flex-col">
          <div className="flex items-center gap-3 p-3">
            <motion.div
              initial={{ width: 48, height: 48 }}
              animate={{ width: isOpen ? 36 : 48, height: isOpen ? 36 : 48 }}
              className="flex aspect-square items-center justify-center rounded-lg bg-[#F4F4F7] text-xl text-[#b0b0b0]"
            >
              <GrNotification />
            </motion.div>
            <div className="flex grow flex-col">
              <motion.h2 layout className="font-medium">
                5 New Activities
              </motion.h2>
              <AnimatePresence initial={false}>
                {!isOpen ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-[#A1A1A1]"
                  >
                    What&apos;s happening around you
                  </motion.p>
                ) : null}
              </AnimatePresence>
            </div>
            <motion.button
              animate={{ rotateX: isOpen ? 180 : 0 }}
              className="text-2xl text-[#A5A1AD]"
              onClick={onClickHandler}
            >
              <IoIosArrowDropdownCircle />
            </motion.button>
          </div>

          <AnimatePresence>
            {isOpen ? (
              <div className="relative">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{ opacity: 0, position: "absolute" }}
                  className="top-0 w-full"
                >
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Fragment key={index}>
                      <div className="flex h-12 items-center justify-between pl-4 pr-2">
                        <div>
                          <h2 className="text-sm font-medium text-[#7d7d7d]">
                            5 New Activities
                          </h2>
                          <p className="text-xs text-[#A1A1A1]">
                            You can do it
                          </p>
                        </div>
                        <button className="text-xl text-[#A1A1A1]">
                          <MdKeyboardArrowRight />
                        </button>
                      </div>
                      {index !== 4 && <Hr className="my-0 bg-black/5" />}
                    </Fragment>
                  ))}
                </motion.div>
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
    </MotionConfig>
  );
}
