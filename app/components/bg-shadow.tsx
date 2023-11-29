"use client";

import React, { useRef } from "react";
import { motion, useTransform, useScroll } from "framer-motion";

export default function BgShadow() {
  const svgRef = useRef<null | HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: svgRef,
    offset: ["start end"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);

  return (
    <>
      <motion.svg
        height="569"
        viewBox="0 0 1372 569"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-0 top-0 w-full max-md:-translate-y-24 md:opacity-75"
        style={{ y }}
      >
        <g filter="url(#filter0_f_31_2)">
          <path
            d="M1154.45 254.537C972.452 98.1365 685.619 36.7032 564.952 25.5365C156.152 -54.0635 244.952 22.3699 340.452 70.5365C687.619 197.037 1336.45 410.937 1154.45 254.537Z"
            fill="white"
            fillOpacity="0.15"
          />
        </g>
        <defs>
          <filter
            id="filter0_f_31_2"
            x="0.799988"
            y="-268.2"
            width="1444.44"
            height="836.957"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend
              mode="normal"
              in="SourceGraphic"
              in2="BackgroundImageFix"
              result="shape"
            />
            <feGaussianBlur
              stdDeviation="129.6"
              result="effect1_foregroundBlur_31_2"
            />
          </filter>
        </defs>
      </motion.svg>

      <div className="stars pointer-events-none absolute left-0 top-0 h-px w-px opacity-30 md:opacity-20" />
      <div className="stars_2 pointer-events-none absolute left-0 top-0 h-0.5 w-0.5 opacity-30 md:opacity-20" />
    </>
  );
}
