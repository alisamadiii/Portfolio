"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Github, Linkedin } from "lucide-react";

export default function Home() {
  const [gradientColor, setGradientColor] = useState(1);

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update the gradientColor value here
      setGradientColor((prevColor) => (prevColor % 3) + 1);
    }, 2000); // 1000 milliseconds = 1 second

    // To stop the looped function when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  return (
    <main>
      <header
        className={containerVariants({
          size: "xl",
          className:
            "flex flex-col items-center justify-center max-md:py-20 md:h-dvh",
        })}
      >
        <Image src={"/Logo.png"} width={60} height={60} alt="logo" />
        <h1 className="max-w-4xl my-4 text-4xl text-center md:text-5xl lg:text-6xl">
          Experienced web developer specializing in{" "}
          <span
            className={`text-transparent bg-gradient-to-tr bg-clip-text ${
              gradientColor === 1
                ? "from-gradient-1-from to-gradient-1-to"
                : gradientColor === 2
                ? "from-gradient-2-from to-gradient-2-to"
                : "from-gradient-3-from to-gradient-3-to"
            }`}
          >
            ReactJS
          </span>
          .
        </h1>
        <Text
          variant={"muted-lg"}
          size={20}
          className="mb-8 text-center max-md:text-base"
        >
          I have a strong foundation in HTML, CSS, and JavaScript, and I am
          skilled in creating interactive and visually appealing websites.
        </Text>
        <div className="flex flex-col items-center justify-center w-full gap-3 md:gap-5 md:flex-row">
          <div className="max-md:w-full max-md:max-w-md p-0.5 rounded bg-gradient-to-r from-gradient-1-from to-gradient-1-to">
            <Button
              variant={"primary"}
              size={"lg"}
              className="max-md:w-full max-md:max-w-md"
            >
              Contact me
            </Button>
          </div>
          <Button size={"lg"} className="max-md:w-full max-md:max-w-md">
            Download CV
          </Button>
          <div className="flex gap-3 md:gap-5 max-md:w-full max-md:max-w-md">
            <Button size={"lg"} className="w-full px-4">
              <Linkedin />
            </Button>
            <Button size={"lg"} className="w-full px-4">
              <Github />
            </Button>
          </div>
        </div>
      </header>
    </main>
  );
}
