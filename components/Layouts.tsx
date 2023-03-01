import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
const { DateTime } = require("luxon");

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
  const [myTime, setMyTime] = useState("");

  useEffect(() => {
    const TimeNow = () => {
      const now = DateTime.now().setZone("Asia/Makassar");
      const { hour, minute, second } = now.c;
      setMyTime(`${hour}:${minute}:${second}`);
    };

    TimeNow();

    setInterval(() => TimeNow(), 1000);
  }, []);

  return (
    <div
      className={`${domine.className} w-full max-w-[948px] mx-auto p-4 text-black`}
    >
      <div>
        <p className="text-sm md:text-base opacity-70">
          {myTime} - Asia/Makassar
        </p>
        <Image
          src={MyImage}
          width={154}
          height={154}
          alt=""
          className="rounded-full"
        />
        <Navbar />
      </div>
      <hr />
      <main>{children}</main>
    </div>
  );
}
