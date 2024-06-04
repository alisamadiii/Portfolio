"use client";

import React, { useState } from "react";
import { MotionConfig, motion } from "framer-motion";
import WhatILearnt from "@/components/WhatILearnt";
import Wrapper from "@/components/designs/wrapper";

const inputText = "is there an orange warning message saying “a person”";

export default function Day20() {
  const [isHover, setIsHover] = useState(false);

  const onMouseEnter = () => setIsHover(true);
  const onMouseLeave = () => setIsHover(false);

  return (
    <>
      <WhatILearnt
        values={["Nowadays I am using <b>mix blend mode</b> a lot."]}
        credit={{
          link: "https://x.com/hristiyan_iv/status/1797732381383901209",
          text: "Inspired by Hristiyan Iv",
        }}
      />
      <Wrapper className="bg-[#0B0B0B] text-white">
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
                <p className="text-xs text-[#946A52]">
                  Maximum callstack exceeded
                </p>
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
      </Wrapper>
    </>
  );
}

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
