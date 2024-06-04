"use client";

import React, { useRef, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  type MotionValue,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import useMeasure from "react-use-measure";

import IphoneSimulator from "../iphone-simulator";

// ! HoverCardAnimation --- Start

function GrayWrapper({
  children,
  isHover,
}: {
  children: React.ReactNode;
  isHover: boolean;
}) {
  return (
    <motion.div
      initial={{ x: 16 }}
      animate={{ x: isHover ? 32 : 16 }}
      className="flex h-16 w-72 translate-x-4 items-center gap-4 rounded-lg border-[#262626] bg-[#1D1D1D] pl-4"
    >
      {children}
    </motion.div>
  );
}

const inputText = "is there an orange warning message saying “a person”";

export function HoverCardAnimation() {
  const [isHover, setIsHover] = useState(false);

  const onMouseEnter = () => setIsHover(true);
  const onMouseLeave = () => setIsHover(false);

  return (
    <div
      className="relative flex h-[388px] w-full max-w-[333px] flex-col items-end gap-6 overflow-hidden rounded-[10px] border border-[#262626] bg-[#181818] py-7"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Right shadow */}
      <div className="absolute bottom-0 right-0 top-0 z-10 w-1/2 bg-gradient-to-r from-transparent to-[#181818]"></div>

      <MotionConfig transition={{ duration: 1, type: "spring", bounce: 0 }}>
        <GrayWrapper isHover={isHover}>
          <svg
            width="29"
            height="30"
            viewBox="0 0 29 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="14.5394" cy="15" r="13.6463" stroke="#3D3C3A" />
            <path
              d="M13.4424 13.554V13.554C14.2919 14.2147 14.7887 15.2305 14.7887 16.3066V19.1982C14.7887 20.1569 15.1331 21.0837 15.7591 21.8099L16.0353 22.1303"
              stroke="#3D3C3A"
              strokeLinecap="round"
            />
            <circle cx="14.1405" cy="8.87375" r="1.19669" fill="#3D3C3A" />
          </svg>
          <div>
            <h3 className="text-sm font-medium tracking-tight text-[#3D3C3A]">
              Info!
            </h3>
            <p className="text-xs text-[#3D3C3A]">
              There is a new update available to buy it
            </p>
          </div>
        </GrayWrapper>

        {/* Second */}
        <div className="relative flex h-16 w-72 items-center gap-4 rounded-lg border-[#A66942] bg-[#5D331D] pl-4">
          <svg
            width="31"
            height="27"
            viewBox="0 0 31 27"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12.4665 1.71191C13.6211 -0.288086 16.5079 -0.288086 17.6625 1.71191L29.6335 22.446C30.7881 24.446 29.3448 26.946 27.0353 26.946H3.09367C0.784218 26.946 -0.659141 24.446 0.495522 22.446L12.4665 1.71191ZM14.0225 10.0883C14.0225 9.51283 14.4891 9.04633 15.0645 9.04633C15.6399 9.04633 16.1064 9.51283 16.1064 10.0883V16.1697C16.1064 16.7452 15.6399 17.2117 15.0645 17.2117C14.4891 17.2117 14.0225 16.7452 14.0225 16.1697V10.0883ZM15.0645 23.1127C16.1194 23.1127 16.9748 22.2575 16.9748 21.2025C16.9748 20.1475 16.1194 19.2922 15.0645 19.2922C14.0094 19.2922 13.1542 20.1475 13.1542 21.2025C13.1542 22.2575 14.0094 23.1127 15.0645 23.1127Z"
              fill="url(#paint0_linear_75_27)"
            />
            <defs>
              <linearGradient
                id="paint0_linear_75_27"
                x1="15.0645"
                y1="0.211914"
                x2="15.0645"
                y2="26.946"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#F7D574" />
                <stop offset="1" stopColor="#E08238" />
              </linearGradient>
            </defs>
          </svg>
          <div>
            <h3 className="text-sm font-medium tracking-tight text-[#C26F35]">
              Warning!
            </h3>
            <p className="text-xs text-[#946A52]">Maximum callstack exceeded</p>
          </div>

          {/* Cursor Animation */}
          <motion.div
            initial={{ scale: 0, x: -20 }}
            animate={{ scale: isHover ? 1 : 0 }}
            className="absolute left-0 h-[88px] w-[90%] origin-top-left rounded-sm bg-[#5D331D] mix-blend-color-dodge"
          >
            <svg
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="absolute bottom-0 right-0 w-3 translate-x-full translate-y-full"
            >
              <path
                d="M13.574 16.2L9.63601 12.262L8.43301 13.464C7.20301 14.696 6.58701 15.311 5.92501 15.166C5.26301 15.02 4.96201 14.203 4.36001 12.57L2.35301 7.11999C1.15201 3.86099 0.550011 2.23199 1.39001 1.39199C2.23001 0.551991 3.86001 1.15199 7.12001 2.35399L12.57 4.35999C14.203 4.96199 15.02 5.26299 15.166 5.92499C15.311 6.58699 14.696 7.20199 13.464 8.43299L12.262 9.63599L16.2 13.574C16.608 13.982 16.812 14.186 16.906 14.414C17.031 14.717 17.031 15.057 16.906 15.361C16.812 15.588 16.608 15.792 16.2 16.2C15.792 16.608 15.588 16.812 15.36 16.906C15.0568 17.0315 14.7162 17.0315 14.413 16.906C14.186 16.812 13.983 16.608 13.574 16.2Z"
                stroke="#A66942"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </div>

        {/* Third */}
        <GrayWrapper isHover={isHover}>
          <svg
            width="29"
            height="30"
            viewBox="0 0 29 30"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="14.5394" cy="15" r="13.6463" stroke="#3D3C3A" />
            <path
              d="M13.4424 13.554V13.554C14.2919 14.2147 14.7887 15.2305 14.7887 16.3066V19.1982C14.7887 20.1569 15.1331 21.0837 15.7591 21.8099L16.0353 22.1303"
              stroke="#3D3C3A"
              strokeLinecap="round"
            />
            <circle cx="14.1405" cy="8.87375" r="1.19669" fill="#3D3C3A" />
          </svg>
          <div>
            <h3 className="text-sm font-medium tracking-tight text-[#3D3C3A]">
              Info!
            </h3>
            <p className="text-xs text-[#3D3C3A]">
              There is a new update available to buy it
            </p>
          </div>
        </GrayWrapper>

        {/* Input */}
        <div className="mt-auto flex h-11 w-80 items-center gap-4 rounded-lg border-[#A66942] bg-[#5D331D] pl-4">
          <svg
            width="17"
            height="16"
            viewBox="0 0 17 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className=""
            style={{ flex: "0 0 auto" }}
          >
            <path
              d="M13.9472 1.55146V4.41748M15.3802 2.98447H12.5142M2.48313 11.5825V13.0155M3.19963 12.299H1.76662M6.73702 10.5078C6.67305 10.2598 6.5438 10.0335 6.36273 9.85244C6.18165 9.67137 5.95536 9.54212 5.7074 9.47815L1.31164 8.34464C1.23664 8.32336 1.17064 8.27819 1.12364 8.21599C1.07664 8.1538 1.05121 8.07796 1.05121 8.00001C1.05121 7.92205 1.07664 7.84622 1.12364 7.78402C1.17064 7.72182 1.23664 7.67665 1.31164 7.65537L5.7074 6.52114C5.95527 6.45723 6.1815 6.32809 6.36257 6.14715C6.54364 5.96621 6.67294 5.74007 6.73702 5.49224L7.87053 1.09648C7.8916 1.02119 7.93672 0.954857 7.99901 0.907606C8.0613 0.860355 8.13734 0.834778 8.21552 0.834778C8.29371 0.834778 8.36975 0.860355 8.43204 0.907606C8.49433 0.954857 8.53945 1.02119 8.56052 1.09648L9.69331 5.49224C9.75728 5.7402 9.88653 5.96649 10.0676 6.14757C10.2487 6.32864 10.475 6.45789 10.7229 6.52186L15.1187 7.65465C15.1943 7.6755 15.2609 7.72058 15.3084 7.78296C15.356 7.84534 15.3817 7.92159 15.3817 8.00001C15.3817 8.07842 15.356 8.15467 15.3084 8.21705C15.2609 8.27944 15.1943 8.32451 15.1187 8.34536L10.7229 9.47815C10.475 9.54212 10.2487 9.67137 10.0676 9.85244C9.88653 10.0335 9.75728 10.2598 9.69331 10.5078L8.5598 14.9035C8.53873 14.9788 8.49361 15.0452 8.43132 15.0924C8.36903 15.1397 8.29299 15.1652 8.21481 15.1652C8.13662 15.1652 8.06058 15.1397 7.99829 15.0924C7.936 15.0452 7.89088 14.9788 7.86981 14.9035L6.73702 10.5078Z"
              stroke="#A66942"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <p className="text-nowrap text-sm text-[#946A52]">
            {inputText.split("").map((value, index) => (
              <motion.span
                key={index}
                initial={{ display: "none" }}
                animate={{ display: isHover ? "inline" : "none" }}
                transition={{
                  type: "tween",
                  delay: isHover ? index * 0.02 : 0,
                }}
              >
                {value}
              </motion.span>
            ))}
          </p>

          <div className="h-[35%] w-px -translate-x-4 animate-pulse rounded-full bg-white/50"></div>
        </div>
      </MotionConfig>
    </div>
  );
}

// ! HoverCardAnimation --- End

// ! Apple Card Expanding --- Start

export function AppleCardExpanding() {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandler = () => setIsOpen(!isOpen);

  return (
    <IphoneSimulator topElements={{ left: !isOpen, right: !isOpen }}>
      <div className="absolute inset-0 -z-10 bg-white"></div>
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
                  className="relative isolate z-50 cursor-pointer shadow-2xl"
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

// ! Apple Card Expanding --- End

// ! RabbitAI --- start

export function RabbitAI() {
  const [isOpen, setIsOpen] = useState(false);

  const onClickHandler = () => {
    setIsOpen(!isOpen);
  };

  const [ref, { height }] = useMeasure();

  return (
    <div className="text-black">
      <MotionConfig transition={{ duration: 0.5, type: "spring", bounce: 0 }}>
        <motion.div
          animate={{ height: height > 0 ? height : undefined }}
          className="overflow-hidden rounded-2xl bg-[#F5F5F5]"
        >
          <div ref={ref} className="flex w-[400px] flex-col items-center p-1">
            <motion.div
              layout
              className="grid w-full grid-cols-5 items-center rounded-2xl p-3"
              animate={{ background: isOpen ? "#ffffff" : "#F5F5F5" }}
            >
              <motion.img
                layoutId="image-layout"
                src="/50-day-challenge/rabbit-ai.png"
                alt="rabbit-ai"
                className="z-20 w-[80px]"
              />
              <div className="col-span-3">
                <AnimatePresence mode="popLayout">
                  <div className="flex font-bold">
                    <motion.h2
                      layoutId="h2-layout"
                      className={`tracking-tight`}
                    >
                      Rabbit R1
                    </motion.h2>

                    {isOpen && (
                      <motion.h2 layoutId="h2-layout" className={`text-center`}>
                        Rabbit R1
                      </motion.h2>
                    )}
                  </div>
                </AnimatePresence>

                {isOpen && (
                  <motion.img
                    layoutId="image-layout"
                    src="/50-day-challenge/rabbit-ai.png"
                    alt="rabbit-ai"
                    className="mx-auto w-[130px]"
                  />
                )}
                <motion.div
                  layout
                  className={`flex text-sm font-normal text-[#A1A1A1] ${!isOpen && "divide-x divide-[#E2E2E2]"}`}
                >
                  <p className="pr-2">
                    <motion.span layoutId="1-layout" className="inline-block">
                      1
                    </motion.span>{" "}
                    <motion.span
                      layoutId="piece-layout"
                      className="inline-block"
                    >
                      piece
                    </motion.span>
                  </p>
                  <p className="px-2">
                    <motion.span layoutId="$-layout" className="inline-block">
                      $
                    </motion.span>
                    <motion.span layoutId="89-layout" className="inline-block">
                      89
                    </motion.span>
                  </p>
                  <p className="px-2">
                    <motion.span
                      layoutId="36645-layout"
                      className="inline-block"
                    >
                      36645
                    </motion.span>
                  </p>
                </motion.div>
              </div>
              <motion.div
                layout
                className="flex flex-col items-end justify-center gap-2"
              >
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white"
                  onClick={onClickHandler}
                >
                  <svg
                    width="15"
                    height="11"
                    viewBox="0 0 15 11"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14.8734 5.50599C14.8525 5.45868 14.3452 4.33339 13.2175 3.2057C11.7149 1.70311 9.8171 0.908998 7.72821 0.908998C5.63932 0.908998 3.74147 1.70311 2.23889 3.2057C1.1112 4.33339 0.601554 5.46048 0.582989 5.50599C0.555748 5.56726 0.541672 5.63357 0.541672 5.70063C0.541672 5.76768 0.555748 5.83399 0.582989 5.89526C0.603949 5.94257 1.1112 7.06727 2.23889 8.19496C3.74147 9.69694 5.63932 10.4911 7.72821 10.4911C9.8171 10.4911 11.7149 9.69694 13.2175 8.19496C14.3452 7.06727 14.8525 5.94257 14.8734 5.89526C14.9007 5.83399 14.9147 5.76768 14.9147 5.70063C14.9147 5.63357 14.9007 5.56726 14.8734 5.50599ZM7.72821 9.53285C5.88486 9.53285 4.27448 8.86271 2.94137 7.54158C2.3944 6.9976 1.92904 6.37732 1.55976 5.70003C1.9289 5.02265 2.39428 4.40235 2.94137 3.85848C4.27448 2.53735 5.88486 1.8672 7.72821 1.8672C9.57156 1.8672 11.1819 2.53735 12.515 3.85848C13.0631 4.40226 13.5295 5.02255 13.8997 5.70003C13.4679 6.50612 11.5868 9.53285 7.72821 9.53285ZM7.72821 2.82541C7.15966 2.82541 6.60389 2.994 6.13116 3.30987C5.65843 3.62574 5.28998 4.07469 5.07241 4.59996C4.85484 5.12523 4.79791 5.70322 4.90883 6.26084C5.01974 6.81846 5.29353 7.33067 5.69555 7.73269C6.09757 8.13471 6.60978 8.40849 7.1674 8.51941C7.72502 8.63033 8.30301 8.5734 8.82828 8.35583C9.35355 8.13826 9.8025 7.76981 10.1184 7.29708C10.4342 6.82435 10.6028 6.26857 10.6028 5.70003C10.602 4.93787 10.2989 4.20717 9.76 3.66824C9.22107 3.12932 8.49036 2.8262 7.72821 2.82541ZM7.72821 7.61644C7.34918 7.61644 6.97866 7.50404 6.66351 7.29347C6.34836 7.08289 6.10272 6.78358 5.95768 6.43341C5.81263 6.08323 5.77468 5.6979 5.84862 5.32615C5.92257 4.95441 6.10509 4.61293 6.3731 4.34492C6.64112 4.0769 6.98259 3.89438 7.35434 3.82044C7.72608 3.74649 8.11141 3.78445 8.46159 3.92949C8.81177 4.07454 9.11107 4.32017 9.32165 4.63533C9.53223 4.95048 9.64462 5.321 9.64462 5.70003C9.64462 6.20829 9.44271 6.69574 9.08332 7.05513C8.72392 7.41453 8.23647 7.61644 7.72821 7.61644Z"
                      fill="black"
                    />
                  </svg>
                </button>
                <button className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                  <svg
                    width="14"
                    height="13"
                    viewBox="0 0 14 13"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <line
                      x1="0.0430813"
                      y1="4.2107"
                      x2="13.4133"
                      y2="4.2107"
                      stroke="#060606"
                      strokeWidth="1.45864"
                    />
                    <circle
                      cx="9.07162"
                      cy="3.98707"
                      r="1.85832"
                      fill="white"
                      stroke="black"
                      strokeWidth="0.345903"
                    />
                    <line
                      x1="0.0430813"
                      y1="9.56476"
                      x2="13.4133"
                      y2="9.56476"
                      stroke="#060606"
                      strokeWidth="1.45864"
                    />
                    <circle
                      cx="4.10234"
                      cy="9.468"
                      r="1.8215"
                      fill="white"
                      stroke="black"
                      strokeWidth="0.339049"
                    />
                  </svg>
                </button>
              </motion.div>
            </motion.div>

            {isOpen && (
              <div className="mt-4 grid w-full grid-cols-3 divide-x divide-[#E2E2E2] px-8 text-xl font-normal text-[#A1A1A1]">
                <p className="flex flex-col pr-2">
                  <div className="h-6">
                    <motion.span
                      layoutId="1-layout"
                      className="absolute inline-block text-black"
                    >
                      1
                    </motion.span>
                  </div>{" "}
                  <div className="relative h-8">
                    <motion.span
                      layoutId="piece-layout"
                      className="absolute inline-block text-sm"
                    >
                      piece
                    </motion.span>
                  </div>
                </p>
                <p className="flex flex-col px-2">
                  <div className="relative h-6">
                    <motion.span
                      layoutId="89-layout"
                      className="absolute inline-block text-black"
                    >
                      89
                    </motion.span>
                  </div>
                  <div className="relative h-8">
                    <motion.span
                      layoutId="cost-layout"
                      className="inline-block text-sm"
                    >
                      Cost
                    </motion.span>
                    <motion.span
                      layoutId="$-layout"
                      className="absolute top-[6px] inline-block text-sm"
                    >
                      $
                    </motion.span>
                  </div>
                </p>
                <p className="flex flex-col px-2">
                  <div className="relative h-6">
                    <motion.span
                      layoutId="36645-layout"
                      className="absolute inline-block text-black"
                    >
                      36645
                    </motion.span>
                  </div>
                  <div className="relative h-8">
                    <motion.span
                      layoutId="hs-layout"
                      className="inline-block text-sm"
                    >
                      HS code
                    </motion.span>
                  </div>
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </MotionConfig>
    </div>
  );
}

// ! RabbitAI --- End

// ! Macos Hover Clone --- Start

const initialValues = [
  {
    name: "finder",
    url: "https://cdn.jim-nielsen.com/macos/256/finder-2021-09-10.png?rf=1024",
  },
  {
    name: "siri",
    url: "https://cdn.jim-nielsen.com/macos/256/siri-2021-09-10.png?rf=1024",
  },
  {
    name: "keynote",
    url: "https://cdn.jim-nielsen.com/macos/256/keynote-2021-11-15.png?rf=1024",
  },
  {
    name: "source-files-git-storage",
    url: "https://cdn.jim-nielsen.com/macos/256/source-files-git-storage-2023-11-21.png?rf=1024",
  },
  {
    name: "simulator",
    url: "https://cdn.jim-nielsen.com/macos/256/simulator-2022-11-09.png?rf=1024",
  },
  {
    name: "raycast",
    url: "https://cdn.jim-nielsen.com/macos/256/raycast-2023-02-14.png?rf=1024",
  },
  {
    name: "taska-for-github-gitlab-issues",
    url: "https://cdn.jim-nielsen.com/macos/256/taska-for-github-gitlab-issues-2024-04-24.png?rf=1024",
  },
  {
    name: "folder-colorizer-pro",
    url: "https://cdn.jim-nielsen.com/macos/256/folder-colorizer-pro-2023-11-02.png?rf=1024",
  },
  {
    name: "telegram",
    url: "https://cdn.jim-nielsen.com/macos/256/telegram-2021-07-12.png?rf=1024",
  },
  {
    name: "preview",
    url: "https://cdn.jim-nielsen.com/macos/256/preview-2021-05-28.png?rf=1024",
  },
  {
    name: "github-desktop",
    url: "https://cdn.jim-nielsen.com/macos/256/github-desktop-2021-05-20.png?rf=1024",
  },
  {
    name: "figma",
    url: "https://cdn.jim-nielsen.com/macos/256/figma-2021-05-05.png?rf=1024",
  },
];

export function MacosHoverClone() {
  const mouseX = useMotionValue(Infinity);

  return (
    <div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className="fixed bottom-8 left-1/2 z-50 flex h-[65px] -translate-x-1/2 items-end gap-2 rounded-3xl border border-white/20 bg-black/20 px-2 pb-[8px] backdrop-blur"
    >
      {initialValues.map((value, index) => (
        <EachIcon key={index} mouseX={mouseX} value={value} />
      ))}
    </div>
  );
}

function EachIcon({
  mouseX,
  value,
}: {
  mouseX: MotionValue;
  value: { name: string; url: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const distance = useTransform(mouseX, (val) => {
    const obj = ref.current?.getBoundingClientRect() || { x: 0, width: 0 };

    return val - obj.x - obj.width / 2;
  });
  const widthSync = useTransform(distance, [-200, 0, 200], [48, 80, 48]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 300,
    damping: 15,
  });

  return (
    <motion.div
      ref={ref}
      className="group flex aspect-square w-12 flex-col items-center rounded-xl"
      style={{ width }}
    >
      <div className="pointer-events-none absolute top-0 isolate flex -translate-y-16 justify-center rounded-lg border border-[#6e6867] bg-[#2C2625] px-3 py-1 text-sm font-light capitalize text-white opacity-0 group-hover:opacity-100">
        {value.name.replaceAll("-", " ")}
        <div className="absolute bottom-0 -z-10 aspect-square w-[10px] translate-y-[5.7px] rotate-45 border-b border-r border-[#6e6867] bg-[#2C2625]"></div>
      </div>
      <img src={value.url} className="h-full w-full object-cover" />
    </motion.div>
  );
}

// ! Macos Hover Clone --- End
