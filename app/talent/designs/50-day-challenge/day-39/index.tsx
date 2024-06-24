"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import Wrapper from "@/components/designs/wrapper";
import ConnectWallet from "./connect-wallet";
import useMeasure from "react-use-measure";

export default function Day39() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);

  const [ref, { height }] = useMeasure();

  const onClickHandler = () => setIsOpen(!isOpen);
  const onScanClickHandler = () => setIsScanOpen(!isScanOpen);

  return (
    <Wrapper>
      <button
        className="h-9 rounded-xl bg-[#00CFFF] px-4 text-sm font-medium text-white shadow-[0_2px_4px_0_rgba(0,0,0,.02)] duration-200 hover:bg-[#00C1FF]"
        onClick={onClickHandler}
      >
        Connect wallet
      </button>

      <AnimatePresence>
        {isOpen ? (
          <div className="fixed left-0 top-0 isolate z-50 flex h-full w-full items-center justify-center">
            {/* background */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute inset-0 -z-10 bg-[#D3D7DB]/50"
              onClick={onClickHandler}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.97, width: 360 }}
              animate={{
                opacity: 1,
                scale: 1,
                width: isScanOpen ? 343 : 360,
                height,
              }}
              exit={{ opacity: 0, scale: 0.93 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden rounded-[20px] bg-[#F6F6F6] shadow-[0px_2px_4px_rgba(0,0,0,0.02)]"
            >
              <div ref={ref} className="px-6 pb-6">
                <header className="flex h-16 items-center justify-between">
                  {isScanOpen ? (
                    <button
                      className="flex h-8 w-8 items-center text-[#999999]"
                      onClick={onScanClickHandler}
                    >
                      <svg
                        width="9"
                        height="16"
                        viewBox="0 0 9 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 1L1 8L8 15"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>
                      </svg>
                    </button>
                  ) : (
                    <button className="flex h-8 w-8 items-center text-[#999999]">
                      <svg
                        aria-hidden="true"
                        width="22"
                        height="22"
                        viewBox="0 0 22 22"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M20 11C20 15.9706 15.9706 20 11 20C6.02944 20 2 15.9706 2 11C2 6.02944 6.02944 2 11 2C15.9706 2 20 6.02944 20 11ZM22 11C22 17.0751 17.0751 22 11 22C4.92487 22 0 17.0751 0 11C0 4.92487 4.92487 0 11 0C17.0751 0 22 4.92487 22 11ZM11.6445 12.7051C11.6445 13.1348 11.3223 13.4678 10.7744 13.4678C10.2266 13.4678 9.92578 13.1885 9.92578 12.6191V12.4795C9.92578 11.4268 10.4951 10.8574 11.2686 10.3203C12.2031 9.67578 12.665 9.32129 12.665 8.59082C12.665 7.76367 12.0205 7.21582 11.043 7.21582C10.3232 7.21582 9.80762 7.57031 9.45312 8.16113C9.38282 8.24242 9.32286 8.32101 9.2667 8.39461C9.04826 8.68087 8.88747 8.8916 8.40039 8.8916C8.0459 8.8916 7.66992 8.62305 7.66992 8.15039C7.66992 7.96777 7.70215 7.7959 7.75586 7.61328C8.05664 6.625 9.27051 5.75488 11.1182 5.75488C12.9336 5.75488 14.5234 6.71094 14.5234 8.50488C14.5234 9.7832 13.7822 10.417 12.7402 11.1045C11.999 11.5986 11.6445 11.9746 11.6445 12.5762V12.7051ZM11.9131 15.5625C11.9131 16.1855 11.376 16.6797 10.7529 16.6797C10.1299 16.6797 9.59277 16.1748 9.59277 15.5625C9.59277 14.9395 10.1191 14.4453 10.7529 14.4453C11.3867 14.4453 11.9131 14.9287 11.9131 15.5625Z"
                          fill="currentColor"
                        ></path>
                      </svg>
                    </button>
                  )}
                  <h2 className="absolute left-1/2 w-48 -translate-x-1/2 text-center">
                    <AnimatePresence mode="popLayout">
                      {isScanOpen ? (
                        <motion.span
                          key={"scan"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap"
                        >
                          Scan with MetaMask
                        </motion.span>
                      ) : (
                        <motion.span
                          key={"collect"}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="whitespace-nowrap"
                        >
                          Connect wallet
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </h2>
                  <div className="flex justify-end">
                    <button
                      className="flex h-8 w-8 items-center justify-end text-[#999999]"
                      onClick={onClickHandler}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1 13L13 1M1 1L13 13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </header>

                <AnimatePresence mode="popLayout">
                  {!isScanOpen ? (
                    <motion.div
                      key={"wallet"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.2,
                      }}
                    >
                      <ConnectWallet onScanClickHandler={onScanClickHandler} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key={"scan"}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: 0.2,
                      }}
                    >
                      <div className="aspect-square w-full rounded-2xl bg-gray-200"></div>
                      <p className="flex h-16 items-center justify-center">
                        Don&apos;t have the app?
                      </p>
                      <button className="h-12 w-full rounded-2xl bg-white">
                        Get MetaMask
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </Wrapper>
  );
}
