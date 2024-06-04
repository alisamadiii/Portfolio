"use client";

import React, { useEffect, useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
} from "framer-motion";
import Wrapper from "@/components/designs/wrapper";

export default function ThemeToggle() {
  const color = useMotionValue(
    "linear-gradient(74deg, #2E2E8B 12.71%, #15154E 74.21%)"
  );

  const backgroundImage = useMotionTemplate`${color}`;

  const [toggle, setToggle] = useState(false);

  useEffect(() => {
    if (toggle) {
      animate(color, "linear-gradient(74deg, #1BCEEC 12.71%, #94E9F0 74.21%)", {
        ease: "easeInOut",
        duration: 0.5,
      });
    } else {
      animate(color, "linear-gradient(74deg, #2E2E8B 12.71%, #15154E 74.21%)", {
        ease: "easeInOut",
        duration: 0.5,
      });
    }
  }, [toggle]);

  return (
    <Wrapper>
      <AnimatePresence initial={false}>
        <MotionConfig
          transition={{ ease: "easeInOut", duration: toggle ? 0.5 : 0.3 }}
        >
          <motion.button
            className={`relative flex h-[100px] w-[250px] overflow-hidden rounded-full bg-red-200 px-4 py-3 md:h-[200px] md:w-[500px] ${toggle ? "justify-end" : ""}`}
            onClick={() => setToggle(!toggle)}
            style={{ backgroundImage }}
          >
            {/* Clouds */}
            <AnimatePresence>
              {toggle && (
                <motion.div
                  initial={{ x: "-120%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-120%" }}
                  className="absolute bottom-0 left-0 top-0 flex w-1/2 flex-col items-center justify-center"
                >
                  <svg
                    width="139"
                    height="80"
                    viewBox="0 0 139 80"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="-translate-x-6"
                  >
                    <circle cx="25" cy="54" r="25" fill="white" />
                    <circle cx="65" cy="40" r="40" fill="white" />
                    <circle cx="108" cy="35" r="31" fill="white" />
                  </svg>
                  <svg
                    width="85"
                    height="53"
                    viewBox="0 0 85 53"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="translate-x-12"
                  >
                    <circle cx="15.5" cy="34.5" r="15.5" fill="white" />
                    <circle cx="42.5" cy="26.5" r="26.5" fill="white" />
                    <circle cx="69" cy="34" r="16" fill="white" />
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              layout
              animate={{
                boxShadow: toggle
                  ? "0px 0px 62px rgba(255, 232, 121, 0.79)"
                  : "0px 0px 61px rgba(243, 243, 243, 0.59)",
              }}
              className="relative aspect-square h-full overflow-hidden rounded-full"
            >
              {/* Shadow */}
              <motion.div
                animate={{ rotate: toggle ? "-180deg" : "0deg" }}
                className="absolute inset-0"
              >
                <motion.div
                  animate={{ backgroundColor: toggle ? "#FFE879" : "#D9D9EC" }}
                  className="absolute inset-0 rounded-full"
                />
                <motion.div
                  animate={{ backgroundColor: toggle ? "#FFE879" : "#F3F3F3" }}
                  className="absolute inset-0 translate-x-[10%] translate-y-[-5%] rounded-full"
                />

                {/* Particles */}
                <motion.div
                  animate={{
                    opacity: toggle ? 0 : 1,
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <div
                    className="h-4 w-4 -translate-y-10 rounded-full bg-[#EFEFF6] "
                    style={{
                      boxShadow:
                        "0px 4px 9px 0px rgba(179, 179, 223, 0.24) inset",
                    }}
                  />
                  <div
                    className="h-7 w-7 -translate-y-10 translate-x-14 rounded-full bg-[#EFEFF6]"
                    style={{
                      boxShadow:
                        "0px 4px 9px 0px rgba(179, 179, 223, 0.24) inset",
                    }}
                  />
                  <div
                    className="h-9 w-9 -translate-x-7 translate-y-4 rounded-full bg-[#EFEFF6]"
                    style={{
                      boxShadow:
                        "0px 4px 9px 0px rgba(179, 179, 223, 0.24) inset",
                    }}
                  />
                  <div
                    className="h-5 w-5 translate-y-8 rounded-full bg-[#EFEFF6]"
                    style={{
                      boxShadow:
                        "0px 4px 9px 0px rgba(179, 179, 223, 0.24) inset",
                    }}
                  />
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Stars */}
            <AnimatePresence initial={false}>
              {!toggle && (
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  className="absolute bottom-0 right-0 top-0 flex w-1/2 flex-col items-center justify-center"
                >
                  <svg
                    width="212"
                    height="163"
                    viewBox="0 0 212 163"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g filter="url(#filter0_d_2_76)">
                      <circle cx="55.5" cy="18.5" r="2.5" fill="#F1F1F1" />
                    </g>
                    <g filter="url(#filter1_d_2_76)">
                      <circle cx="174.5" cy="12.5" r="2.5" fill="#F1F1F1" />
                    </g>
                    <g filter="url(#filter2_d_2_76)">
                      <circle cx="140" cy="150" r="2" fill="#F1F1F1" />
                    </g>
                    <g filter="url(#filter3_d_2_76)">
                      <circle cx="122.5" cy="67.5" r="1.5" fill="#F1F1F1" />
                    </g>
                    <g filter="url(#filter4_d_2_76)">
                      <circle cx="200.5" cy="30.5" r="1.5" fill="#F1F1F1" />
                    </g>
                    <g filter="url(#filter5_d_2_76)">
                      <circle cx="11.5" cy="151.5" r="1.5" fill="#F1F1F1" />
                    </g>
                    <g filter="url(#filter6_d_2_76)">
                      <circle cx="44" cy="93" r="1" fill="#F1F1F1" />
                    </g>
                    <defs>
                      <filter
                        id="filter0_d_2_76"
                        x="43"
                        y="6"
                        width="25"
                        height="25"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                          in="SourceAlpha"
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          result="hardAlpha"
                        />
                        <feOffset />
                        <feGaussianBlur stdDeviation="5" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0.69 0"
                        />
                        <feBlend
                          mode="normal"
                          in2="BackgroundImageFix"
                          result="effect1_dropShadow_2_76"
                        />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="effect1_dropShadow_2_76"
                          result="shape"
                        />
                      </filter>
                      <filter
                        id="filter1_d_2_76"
                        x="162"
                        y="0"
                        width="25"
                        height="25"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                          in="SourceAlpha"
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          result="hardAlpha"
                        />
                        <feOffset />
                        <feGaussianBlur stdDeviation="5" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0.69 0"
                        />
                        <feBlend
                          mode="normal"
                          in2="BackgroundImageFix"
                          result="effect1_dropShadow_2_76"
                        />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="effect1_dropShadow_2_76"
                          result="shape"
                        />
                      </filter>
                      <filter
                        id="filter2_d_2_76"
                        x="128"
                        y="138"
                        width="24"
                        height="24"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                          in="SourceAlpha"
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          result="hardAlpha"
                        />
                        <feOffset />
                        <feGaussianBlur stdDeviation="5" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0.69 0"
                        />
                        <feBlend
                          mode="normal"
                          in2="BackgroundImageFix"
                          result="effect1_dropShadow_2_76"
                        />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="effect1_dropShadow_2_76"
                          result="shape"
                        />
                      </filter>
                      <filter
                        id="filter3_d_2_76"
                        x="111"
                        y="56"
                        width="23"
                        height="23"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                          in="SourceAlpha"
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          result="hardAlpha"
                        />
                        <feOffset />
                        <feGaussianBlur stdDeviation="5" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0.69 0"
                        />
                        <feBlend
                          mode="normal"
                          in2="BackgroundImageFix"
                          result="effect1_dropShadow_2_76"
                        />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="effect1_dropShadow_2_76"
                          result="shape"
                        />
                      </filter>
                      <filter
                        id="filter4_d_2_76"
                        x="189"
                        y="19"
                        width="23"
                        height="23"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                          in="SourceAlpha"
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          result="hardAlpha"
                        />
                        <feOffset />
                        <feGaussianBlur stdDeviation="5" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0.69 0"
                        />
                        <feBlend
                          mode="normal"
                          in2="BackgroundImageFix"
                          result="effect1_dropShadow_2_76"
                        />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="effect1_dropShadow_2_76"
                          result="shape"
                        />
                      </filter>
                      <filter
                        id="filter5_d_2_76"
                        x="0"
                        y="140"
                        width="23"
                        height="23"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                          in="SourceAlpha"
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          result="hardAlpha"
                        />
                        <feOffset />
                        <feGaussianBlur stdDeviation="5" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0.69 0"
                        />
                        <feBlend
                          mode="normal"
                          in2="BackgroundImageFix"
                          result="effect1_dropShadow_2_76"
                        />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="effect1_dropShadow_2_76"
                          result="shape"
                        />
                      </filter>
                      <filter
                        id="filter6_d_2_76"
                        x="33"
                        y="82"
                        width="22"
                        height="22"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feFlood floodOpacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                          in="SourceAlpha"
                          type="matrix"
                          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                          result="hardAlpha"
                        />
                        <feOffset />
                        <feGaussianBlur stdDeviation="5" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix
                          type="matrix"
                          values="0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0 0.945098 0 0 0 0.69 0"
                        />
                        <feBlend
                          mode="normal"
                          in2="BackgroundImageFix"
                          result="effect1_dropShadow_2_76"
                        />
                        <feBlend
                          mode="normal"
                          in="SourceGraphic"
                          in2="effect1_dropShadow_2_76"
                          result="shape"
                        />
                      </filter>
                    </defs>
                  </svg>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </MotionConfig>
      </AnimatePresence>
    </Wrapper>
  );
}
