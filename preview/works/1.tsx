"use client";

import React, { useState } from "react";

import { AnimatePresence, MotionConfig, motion } from "framer-motion";

import IphoneSimulator from "@/components/IphoneSimulator";
import { NavigatingClick } from "@/components/NavigatingClick";

export default function Work1() {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandler = () => setIsOpen(!isOpen);

  return (
    <IphoneSimulator
      classWrapper="w-[400px]"
      className="overflow-hidden bg-white [&>[data-top]]:bg-transparent"
    >
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <div className="px-4 pt-4 text-black">
          <h2 className="text-2xl font-semibold tracking-tight">
            Action-Packed
          </h2>

          <motion.div layoutId="wrapper" className="bg-white">
            <motion.div
              whileTap={{ scale: 0.97 }}
              className="relative mt-4 cursor-pointer overflow-hidden rounded-xl bg-white shadow-2xl"
              onClick={onClickHandler}
              style={{ borderRadius: 12 }}
            >
              <NavigatingClick />
              <motion.img
                layoutId="bg-image"
                src="https://ips4-wowslegends-global.gcdn.co/monthly_2022_02/Somers_US_T10_DD_Art_key-artwork-Release-4.1_1920x1080_WG_Spb_WoWSL_NoLogo.jpg.8aa1eb2cd9b0529ca9e4a64f918f757a.jpg"
                className="aspect-[4/4.7] w-full object-cover"
              />
              <div className="absolute bottom-0 left-0 isolate w-full">
                <motion.div
                  layoutId="gradient-bg"
                  className="absolute inset-0 -z-10 bg-gradient-to-t from-[#195C6C] to-transparent"
                />

                <div className="-translate-y-4 translate-x-4">
                  <motion.small
                    layoutId="top-small-layout"
                    className="relative flex items-center justify-start uppercase text-white/80"
                  >
                    games we love
                  </motion.small>

                  <motion.h2
                    layoutId="top-title-layout"
                    className="text-2xl font-bold text-white"
                  >
                    World of Warships: Legends
                  </motion.h2>
                </div>

                <motion.div
                  className="relative isolate flex h-[70px] w-full items-center gap-2 px-4"
                  style={{
                    borderBottomLeftRadius: 12,
                    borderBottomRightRadius: 12,
                  }}
                >
                  <motion.div
                    layoutId="bottom-background"
                    className="absolute inset-0 -z-10 bg-gradient-to-t from-[#195C6C] to-[#103b45]"
                  />

                  <motion.img
                    layoutId="bottom-image-layout"
                    src="https://play-lh.googleusercontent.com/haX300DkBrubUDWbfVQpx-Ke6Z4Ku6wHdX-yuGmfqLtMvqu2O0WglXmQK1scwLpQBYo"
                    className="aspect-square w-11 rounded-xl object-cover"
                  />
                  <motion.div layoutId="bottom-text-layout">
                    <h3 className="text-sm font-medium leading-4 text-white">
                      World of Warships: <br /> Legends MMO
                    </h3>
                    <p className="text-xs text-white opacity-55">
                      War games and naval battle...
                    </p>
                  </motion.div>
                  <motion.div
                    layoutId="bottom-button-layout"
                    className="ml-auto flex flex-col items-center justify-center gap-1 self-end pb-2"
                    style={{ flex: "0 0 auto" }}
                  >
                    <button className="h-7 w-14 rounded-full bg-white/30 text-white">
                      Get
                    </button>
                    <small className="text-[7px] text-white/55">
                      In-App Purchases
                    </small>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                layoutId="wrapper"
                className="absolute inset-0 bg-white"
              >
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  className="relative isolate z-20 cursor-pointer shadow-2xl"
                  onClick={onClickHandler}
                  style={{ borderRadius: 0 }}
                >
                  <motion.img
                    layoutId="bg-image"
                    src="https://ips4-wowslegends-global.gcdn.co/monthly_2022_02/Somers_US_T10_DD_Art_key-artwork-Release-4.1_1920x1080_WG_Spb_WoWSL_NoLogo.jpg.8aa1eb2cd9b0529ca9e4a64f918f757a.jpg"
                    className="aspect-[4/4.7] w-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 isolate w-full">
                    <motion.div
                      layoutId="gradient-bg"
                      className="absolute inset-0 -z-10 bg-gradient-to-t from-[#195C6C] to-transparent"
                    />

                    <motion.div
                      // layoutId="top-text-layout"
                      className="flex flex-col px-4 pb-8"
                    >
                      <motion.small
                        layoutId="top-small-layout"
                        className="relative flex items-center justify-start uppercase text-white/80"
                      >
                        games we love
                      </motion.small>

                      <motion.h2
                        layoutId="top-title-layout"
                        className="text-2xl font-bold text-white"
                      >
                        World of Warships: Legends
                      </motion.h2>
                    </motion.div>
                    <motion.div
                      // layoutId="bottom-element-layout"
                      className="relative isolate flex h-[70px] w-full items-center gap-2 px-4"
                      style={{
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                      }}
                    >
                      <motion.div
                        layoutId="bottom-background"
                        className="absolute inset-0 -z-10 bg-gradient-to-t from-[#195C6C] to-[#103b45]"
                      />
                      <motion.img
                        layoutId="bottom-image-layout"
                        src="https://play-lh.googleusercontent.com/haX300DkBrubUDWbfVQpx-Ke6Z4Ku6wHdX-yuGmfqLtMvqu2O0WglXmQK1scwLpQBYo"
                        className="aspect-square w-11 rounded-xl object-cover"
                      />
                      <motion.div layoutId="bottom-text-layout">
                        <h3 className="text-sm font-medium leading-4 text-white">
                          World of Warships: <br /> Legends MMO
                        </h3>
                        <p className="text-xs text-white opacity-55">
                          War games and naval battle...
                        </p>
                      </motion.div>
                      <motion.div
                        layoutId="bottom-button-layout"
                        className="ml-auto flex flex-col items-center justify-center gap-1 self-end pb-2"
                        style={{ flex: "0 0 auto" }}
                      >
                        <button className="h-7 w-14 rounded-full bg-white/30 text-white">
                          Get
                        </button>
                        <small className="text-[7px] text-white/55">
                          In-App Purchases
                        </small>
                      </motion.div>
                    </motion.div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2 } }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className="overflow-auto p-4"
                >
                  <p className="text-lg leading-6 text-[#959597]">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Molestias velit explicabo{" "}
                    <b className="text-black">cupiditate</b> libero aliquid ea
                    fuga iure aut minima possimus! Deleniti veritatis dicta
                    eligendi veniam quaerat saepe doloribus itaque debitis.
                  </p>

                  <p className="mt-4 text-lg leading-6 text-[#959597]">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit.
                    Molestias velit explicabo{" "}
                    <b className="text-black">cupiditate</b> libero aliquid ea
                    fuga iure aut minima possimus! Deleniti veritatis dicta
                    eligendi veniam quaerat saepe doloribus itaque debitis.
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </IphoneSimulator>
  );
}
