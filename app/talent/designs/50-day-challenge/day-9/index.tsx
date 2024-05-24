"use client";

import React, { useState } from "react";
import EachTab from "./each-tab";

export interface day8Types {
  id: number;
  title: string;
  description: string;
}

const initialValues: day8Types[] = [
  {
    id: 1,
    title: "Framer Motion",
    description: "It is a great tool for making animation.",
  },
  {
    id: 2,
    title: "Lemonsqueezy",
    description:
      "It is a great tool for making payment. It is a great tool for making payment.",
  },
  {
    id: 3,
    title: "Lemonsqueezy",
    description:
      "It is a great tool for making payment. It is a great tool for making payment.",
  },
];

export default function Day8() {
  const [selectedTab, setSelectedTab] = useState<null | day8Types>(null);

  return (
    <div className="h-[600px] w-full max-w-7xl rounded-xl bg-gray-100 px-4 py-2">
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-red-500"></div>
          <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
          <div className="h-2 w-2 rounded-full bg-green-500"></div>
        </div>

        <ul className="flex divide-x">
          {initialValues.map((value) => (
            <EachTab
              key={value.id}
              value={value}
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}
