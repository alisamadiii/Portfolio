import React from "react";
import Navbar from "./Navbar";

import MyImage from "@/public/My Image.png";
import Image from "next/image";

type Props = {
  children: React.ReactNode;
};

import { Domine } from "next/font/google";

const domine = Domine({
  weight: ["400", "500", "600", "700"],
  display: "swap",
  subsets: ["latin"],
});

export default function Layouts({ children }: Props) {
  return (
    <div
      className={`${domine.className} w-full max-w-[948px] mx-auto p-4 text-black`}
    >
      <div>
        <Image
          src={MyImage}
          width={154}
          height={154}
          alt=""
          className="rounded-full"
        />
        <Navbar />
      </div>
      <main>{children}</main>
    </div>
  );
}
