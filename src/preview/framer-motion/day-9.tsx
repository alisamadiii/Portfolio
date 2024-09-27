"use client";

import React, { useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FaBarcode, FaHourglassEnd } from "react-icons/fa";
import { PiWarningFill } from "react-icons/pi";
import IphoneSimulator from "@/components/IphoneSimulator";

export default function Day9() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [isError, setIsError] = useState(false);

  const onClickHandler = () => {
    setIsOpen(!isOpen);
    setIsSending(false);
    setIsError(false);
  };

  const onSendingHandler = async () => {
    setIsSending(!isSending);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsError(true);
    setIsSending(false);
  };

  return (
    <IphoneSimulator classWrapper="w-[400px]" className="bg-black">
      <div
        className="absolute left-0 top-0 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 blur-3xl"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, #FF6B00 0%, rgba(255, 153, 0, 0.48) 49%, rgba(255, 153, 0, 0.00) 100%)",
        }}
      ></div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 -z-10 rounded-[42px] bg-black/50 backdrop-blur-3xl"
          ></motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-7 flex h-full w-full flex-col justify-end px-4 pb-4">
        <button
          className="h-14 w-full rounded-2xl bg-[#1E1E1E] duration-200 active:scale-90"
          onClick={onClickHandler}
        >
          {isError ? "Okay" : isOpen ? "Cancel" : "Open"}
        </button>

        <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: -80 }}
                exit={{ opacity: 0, y: -30 }}
                className="absolute left-0 w-full -translate-y-20 px-4"
              >
                <motion.div
                  layout
                  className="h-full min-h-[250px] w-full p-px"
                  animate={{
                    background: isError
                      ? "linear-gradient(to bottom, #FE0557 2%, #1E1E1E 50%)"
                      : "linear-gradient(to bottom, #424242, #1E1E1E)",
                  }}
                  style={{
                    borderRadius: 24,
                  }}
                >
                  <motion.div
                    layout
                    className="relative flex h-full min-h-[250px] w-full flex-col items-center justify-center overflow-hidden bg-[#1E1E1E] px-2 pb-4 pt-8"
                    style={{ borderRadius: 24 }}
                  >
                    {isError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-0 h-1/2 w-full scale-125 bg-gradient-to-t from-transparent to-[#FE0557]/50 blur-xl"
                      />
                    )}

                    <motion.div
                      layout
                      className="relative mb-2 flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#424242] text-4xl"
                      animate={{
                        background: isError ? "#FE0557" : "#1E1E1E",
                        borderColor: isError ? "#FE0557" : "#424242",
                      }}
                    >
                      {isSending ? (
                        <motion.span
                          key={"is-sending"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, type: "tween" }}
                          className="text-2xl"
                        >
                          <FaHourglassEnd />
                        </motion.span>
                      ) : isError ? (
                        <motion.span
                          key={"is-error"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, type: "tween" }}
                        >
                          <PiWarningFill />
                        </motion.span>
                      ) : (
                        <motion.span
                          key={"code"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.2, type: "tween" }}
                        >
                          <FaBarcode />
                        </motion.span>
                      )}

                      {isSending && (
                        <>
                          <motion.div
                            className="absolute inset-0 border border-[#424242]"
                            initial={{ opacity: 0 }}
                            animate={{ rotate: "360deg", opacity: 1 }}
                            transition={{
                              rotate: {
                                repeat: Infinity,
                                ease: "linear",
                                duration: 1,
                              },
                            }}
                            style={{
                              borderRadius: "64% 36% 53% 47% / 30% 30% 70% 70%",
                            }}
                          />
                          <motion.div
                            className="absolute inset-0 border border-[#424242]"
                            initial={{ opacity: 0 }}
                            animate={{ rotate: "-360deg", opacity: 1 }}
                            transition={{
                              rotate: {
                                repeat: Infinity,
                                ease: "linear",
                                duration: 1,
                              },
                            }}
                            style={{
                              borderRadius: "64% 36% 71% 29% / 57% 71% 29% 43%",
                            }}
                          />
                          <motion.div
                            className="absolute inset-0 border border-[#424242]"
                            initial={{ opacity: 0 }}
                            animate={{ rotate: "-360deg", opacity: 1 }}
                            transition={{
                              rotate: {
                                repeat: Infinity,
                                ease: "linear",
                                duration: 1,
                              },
                            }}
                            style={{
                              borderRadius: "29% 71% 34% 66% / 77% 71% 29% 23%",
                            }}
                          />
                        </>
                      )}
                    </motion.div>

                    {!isSending && !isError && (
                      <>
                        <h3 className="mb-2 mt-6 text-2xl">New code</h3>
                        <p className="max-w-[200px] text-center text-sm text-[#7F7F7F]">
                          how do you want to receive your verification code?
                        </p>

                        <button
                          className="mt-6 h-14 w-full rounded-2xl bg-[#343434] duration-200 active:scale-90"
                          onClick={onSendingHandler}
                        >
                          Text message
                        </button>
                        <button
                          className="mt-2 h-14 w-full rounded-2xl bg-[#343434] duration-200 active:scale-90"
                          onClick={onSendingHandler}
                        >
                          Call my number
                        </button>
                      </>
                    )}

                    {isError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="flex flex-col items-center justify-center"
                      >
                        <h3 className="mb-2 mt-6 text-2xl">
                          Authentication error
                        </h3>
                        <p className="mb-4 max-w-[200px] text-center text-sm text-[#7F7F7F]">
                          how do you want to receive your verification code?
                        </p>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionConfig>
      </div>
    </IphoneSimulator>
  );
}
