"use client";

import React, { useRef, useState } from "react";
import { cn } from "@/utils";

const initialValues = [
  {
    id: 1,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/BMW_logo_%28gray%29.svg/1200px-BMW_logo_%28gray%29.svg.png?20210211152514",
    color: "#2E409E", // BMW's primary color is black
  },
  {
    id: 2,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/1206px-Amazon_logo.svg.png?20220213013322",
    color: "#FF9900", // Amazon's primary color is orange
  },
  {
    id: 3,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Maersk_Group_Logo.svg/270px-Maersk_Group_Logo.svg.png?20200710145134",
    color: "#009FDA", // Maersk's primary color is blue
  },
  {
    id: 4,
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Twilio-logo-red.svg/2560px-Twilio-logo-red.svg.png",
    color: "#F22F46", // Twilio's primary color is red
  },
];

export default function StripeSelectButton() {
  const [selectedImg, setSelectedImg] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);

  const calculateClipPath = (selectedImg: number) => {
    const positions = ["0%", "25%", "50%", "75%"];
    return `inset(0px ${positions[4 - selectedImg]} 0px ${positions[selectedImg - 1]})`;
  };

  return (
    <div className="relative mx-auto grid w-full max-w-5xl grid-cols-4">
      {initialValues.map((value) => (
        <button
          key={value.id}
          className={cn(
            "flex h-32 grow items-center justify-center outline-none delay-300",
            value.id === selectedImg ? "" : "grayscale"
          )}
          onClick={() => setSelectedImg(value.id)}
        >
          <img
            src={value.url}
            className={`${value.id === 1 ? "h-10" : "h-8"}`}
          />
        </button>
      ))}

      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0 grid grid-cols-4 duration-1000"
        style={{
          clipPath: calculateClipPath(selectedImg),
          transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {initialValues.map((value) => (
          <div
            key={value.id}
            className="h-px w-full"
            style={{ background: value.color }}
          ></div>
        ))}
      </div>
    </div>
  );
}
