"use client";

import Image from "next/image";
import React, { useState } from "react";

const buttons = ["fill", "contain", "cover", "none", "scale-down"];

export default function Tutorial() {
  const [objectFit, setObjectFit] = useState("fill");

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center bg-white text-black">
      <div className="h-96 w-96 overflow-hidden rounded-xl bg-gray-100">
        <Image
          src={
            "https://images.unsplash.com/photo-1712688930249-98e1963af7bd?q=80&w=3870&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          }
          width={800}
          height={600}
          alt=""
          className="h-full w-full"
          // @ts-ignore
          style={{ objectFit }}
        />
      </div>
      <div className="space-x-4">
        {buttons.map((button) => (
          <button
            key={button}
            onClick={() => setObjectFit(button)}
            className={`mt-4 h-8 rounded-md px-4 ${button === objectFit ? "bg-black text-white" : "bg-gray-100"}`}
          >
            {button}
          </button>
        ))}
      </div>
    </div>
  );
}
