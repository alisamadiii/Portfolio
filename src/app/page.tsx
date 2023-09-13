"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";

const gradientVariants = {
  fromGradient1: {
    backgroundImage:
      "linear-gradient(to right, hsl(var(--gradient-1-from)), hsl(var(--gradient-1-to)))",
  },
  fromGradient2: {
    backgroundImage:
      "linear-gradient(to right, hsl(var(--gradient-2-from)), hsl(var(--gradient-2-to)))",
  },
  fromGradient3: {
    backgroundImage:
      "linear-gradient(to right, hsl(var(--gradient-3-from)), hsl(var(--gradient-3-to)))",
  },
};

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
          className: "flex flex-col items-center justify-center h-dvh",
        })}
      >
        <Image src={"/Logo.png"} width={60} height={60} alt="logo" />
        <h1 className="max-w-4xl my-4 text-4xl text-center md:text-5xl lg:text-6xl">
          Experienced web developer specializing in{" "}
          <motion.span
            layout
            className={`text-transparent bg-clip-text`}
            variants={gradientVariants}
            initial="fromGradient1"
            animate={
              gradientColor === 1
                ? "fromGradient1"
                : gradientColor === 2
                ? "fromGradient2"
                : "fromGradient3"
            }
            transition={{ backgroundImage: { duration: 0.5 } }} // Adjust the duration as needed
          >
            ReactJS
          </motion.span>
          .
        </h1>
        <Text
          variant={"muted-lg"}
          size={20}
          className="text-center max-md:text-base"
        >
          I have a strong foundation in HTML, CSS, and JavaScript, and I am
          skilled in creating interactive and visually appealing websites.
        </Text>
      </header>
    </main>
  );
}
