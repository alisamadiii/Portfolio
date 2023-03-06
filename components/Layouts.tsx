import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
const { DateTime } = require("luxon");
import { ThemeProvider } from "next-themes";

import MyImage from "@/public/My Image.png";
import Image from "next/image";
import { IoLogoHtml5, IoLogoCss3, IoLogoJavascript } from "react-icons/io";
import { IoLogoReact } from "react-icons/io5";
import { TbBrandNextjs } from "react-icons/tb";

type Props = {
  children: React.ReactNode;
};

import { Domine } from "next/font/google";
import WavyCircle from "./WavyCircle";

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
      <div
        className={`${domine.className} relative w-full max-w-[948px] mx-auto p-4`}
      >
        <div className="flex flex-col items-start">
          <p className="text-sm md:text-base opacity-70">
            {myTime} - Asia/Makassar - WITA
          </p>
          <div className="flex gap-4">
            <div className="relative mt-4 overflow-hidden rounded-full bg-[#E1E1E1] dark:bg-[#1e1e1e] group isolate">
              <WavyCircle />
              <Image
                src={MyImage}
                width={154}
                height={154}
                alt=""
                className="duration-200 group-hover:scale-125 group-hover:translate-y-4 dark:grayscale dark:contrast-125"
              />
            </div>
            <div className="flex self-end gap-2 text-3xl opacity-75">
              <IoLogoHtml5 />
              <IoLogoCss3 />
              <IoLogoJavascript />
              <IoLogoReact />
              <TbBrandNextjs />
            </div>
          </div>
          <Navbar />
        </div>
        <hr />
        <main>{children}</main>
      </div>
    </ThemeProvider>
  );
}
