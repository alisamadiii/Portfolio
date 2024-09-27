"use client";

import React, { Fragment, useState } from "react";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import { NavigatingClick } from "@/components/NavigatingClick";
import IphoneSimulator from "@/components/IphoneSimulator";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import AnimationSpeed from "@/components/AnimationSpeed";

const buttons = ["notifications", "sound-&-haptics", "focus", "screen-time"];
const buttons2 = ["schedules-summary", "show-preview", "screen-sharing"];

export default function Work7() {
  const [selectedPage, setSelectedPage] = useState<null | string>(null);

  const [duration, setDuration] = useState(0.7);

  const onClickHandler = (value: string | null) => setSelectedPage(value);

  return (
    <>
      <AnimationSpeed onValueChange={setDuration} speeds={[0.7, 1.5, 2]} />
      <IphoneSimulator className="bg-[#f4f3fa]">
        <MotionConfig transition={{ duration, type: "spring", bounce: 0 }}>
          <header className="sticky top-0 -mt-[48px] flex items-center justify-center border-b border-[#D4D2D4] bg-[#FAF9FB] pb-2 pt-14 font-medium">
            <motion.h2 layoutId="settings-text" className="z-20">
              Settings
            </motion.h2>
          </header>

          <div className="mt-8 px-4">
            <div className="rounded-lg bg-white">
              {buttons.map((button, index) => (
                <Fragment key={button}>
                  <button
                    className="relative flex h-10 w-full items-center justify-end gap-2 px-4 text-start text-sm first-of-type:rounded-t-lg last-of-type:rounded-b-lg active:bg-[#E5E5EA]"
                    onClick={() => onClickHandler(button)}
                  >
                    {index === 0 && <NavigatingClick />}
                    <div>
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#FF3B30] text-lg text-white">
                        <Bell className="w-4" />
                      </div>
                    </div>
                    <span className="grow capitalize">
                      {button.replaceAll("-", " ")}
                    </span>
                    <ChevronRight className="w-4 text-[#C4C2C4]" />
                  </button>
                  {index !== buttons.length - 1 && (
                    <div className="my-0 ml-12 h-[0.1px] -translate-y-[0.5px] bg-[#C6C6C8]" />
                  )}
                </Fragment>
              ))}
            </div>
          </div>

          {/* New pages */}
          <AnimatePresence>
            {selectedPage && (
              <div
                key={selectedPage}
                className="pointer-events-none absolute right-0 top-0 z-10 h-full w-full"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-none absolute inset-0 -z-10 bg-black/10"
                />
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pointer-events-auto absolute left-0 top-[57px] z-20 flex items-center -space-x-2 text-3xl text-blue-500"
                  onClick={() => onClickHandler(null)}
                >
                  <ChevronLeft className="mr-2" />
                  <motion.h2 layoutId="settings-text" className="text-sm">
                    Settings
                  </motion.h2>
                </motion.button>
                <motion.div
                  initial={{ x: "110%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "110%" }}
                  className="pointer-events-auto h-full w-full bg-[#FAF9FB]"
                >
                  <motion.header
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="sticky top-0 flex items-center justify-center bg-[#FAF9FB] pb-2 pt-14 font-medium capitalize"
                  >
                    {selectedPage.replaceAll("-", " ")}
                  </motion.header>

                  <div className="p-4">
                    <div className="overflow-hidden rounded-lg bg-white">
                      {buttons2.map((button, index) => (
                        <>
                          <button
                            key={button}
                            className="flex h-10 w-full items-center gap-2 px-4 text-start text-sm active:bg-[#E5E5EA]"
                          >
                            <span className="grow capitalize">
                              {button.replaceAll("-", " ")}
                            </span>
                            {/* <MdKeyboardArrowRight className="text-xl text-[#C4C2C4]" /> */}
                          </button>
                          {/* {index !== buttons2.length - 1 && (
                            <Hr className="my-0 ml-4 h-[0.1px] -translate-y-[0.5px] bg-[#C6C6C8]" />
                          )} */}
                        </>
                      ))}
                    </div>
                    <p className="mt-2 px-4 text-xs text-[#85858B]">
                      Lorem ipsum dolor sit amet consectetur adipisicing elit.
                      Vitae veniam obcaecati ducimus, quidem, numquam ipsa
                      explicabo provident rem.
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </MotionConfig>
      </IphoneSimulator>
    </>
  );
}
