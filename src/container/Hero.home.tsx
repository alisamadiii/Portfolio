import React from "react";
import Link from "next/link";
import { Variants, motion } from "framer-motion";

import { Heading1 } from "@/components";
import Container from "@/layout/Container";

// Icons
import { AiOutlineTwitter } from "react-icons/ai";
import { HiOutlineArrowLongDown } from "react-icons/hi2";

type Props = {};

const HeroItemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function Hero({}: Props) {
  return (
    <>
      {/* Background color + Gradient */}
      <div className="scale-x-110 absolute top-0 left-0 w-full h-full -translate-y-[100px] md:rounded-b-[20%] lg:rounded-b-[100%] bg-light-blue-2 -z-50 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-gradient-to-t from-primary to-secondary blur-3xl opacity-30"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-pattern"></div>
      </div>
      <Container className="flex flex-col items-center justify-center gap-4">
        {/* Twitter Link + Twitter Activities */}
        <motion.div
          variants={HeroItemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 1 }}
          className="flex gap-4 text-sm"
        >
          <a
            href="https://twitter.com/Ali_Developer05"
            target="_blank"
            className="flex items-center gap-2 px-4 py-1 font-bold duration-150 rounded-full text-twitter bg-twitter/10 hover:bg-twitter hover:text-white"
          >
            <AiOutlineTwitter />
            <span>Twitter</span>
          </a>
          <Link
            href="/twitter-activity"
            className="flex items-center gap-2 px-4 py-1 font-bold duration-150 rounded-full text-twitter bg-twitter/10 hover:bg-twitter hover:text-white"
          >
            <span>Twitter Activity</span>
          </Link>
        </motion.div>
        <motion.div
          variants={HeroItemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 1, delay: 0.1 }}
          className="flex flex-col items-center gap-4"
        >
          <Heading1>Ali Reza</Heading1>
          <p className="mb-4 text-base font-medium text-center md:text-lg">
            I have a strong foundation in HTML, CSS, and JavaScript, and I am
            skilled in creating <br /> interactive and visually appealing
            websites.
          </p>
          <Link
            href="/#about"
            scroll={false}
            className="p-2 text-xl duration-200 border rounded-full border-dark-blue animate-bounce hover:bg-dark-blue hover:text-white"
          >
            <HiOutlineArrowLongDown />
          </Link>
        </motion.div>
      </Container>
    </>
  );
}
