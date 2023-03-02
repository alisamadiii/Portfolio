import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
const { DateTime } = require("luxon");
import { ThemeProvider } from "next-themes";

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
    <ThemeProvider>
      <div className={`${domine.className} w-full max-w-[948px] mx-auto p-4`}>
        <div className="flex flex-col items-start">
          <p className="text-sm md:text-base opacity-70">
            {myTime} - Asia/Makassar - WITA
          </p>
          <div className="mt-4 overflow-hidden rounded-full bg-[#E1E1E1] dark:bg-black group">
            <Image
              src={MyImage}
              width={154}
              height={154}
              alt=""
              className="duration-200 group-hover:scale-125 group-hover:translate-y-4"
            />
          </div>
          <Navbar />
        </div>
        <hr />
        <main>{children}</main>
      </div>
    </ThemeProvider>
  );
}
