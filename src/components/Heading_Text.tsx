import React, { ReactNode } from "react";

import { Lobster } from "next/font/google";

type Props = {
  children: ReactNode;
};

const lobster = Lobster({
  weight: ["400"],
  display: "swap",
  subsets: ["latin"],
});

export function Heading1({ children }: Props) {
  return (
    <h1
      className={`${lobster.className} text-transparent text-6xl lg:text-8xl bg-clip-text bg-gradient-to-r from-secondary to-primary`}
    >
      {children}
    </h1>
  );
}

export function Heading2({ children }: Props) {
  return (
    <h2 className={`${lobster.className} text-4xl text-dark-blue-2`}>
      {children}
    </h2>
  );
}
