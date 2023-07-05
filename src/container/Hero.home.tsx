import React from "react";
import Link from "next/link";
import { Variants, motion } from "framer-motion";

import { Heading1 } from "@/components";
import Container from "@/layout/Container";

// Icons
import { AiOutlineTwitter } from "react-icons/ai";
import { HiOutlineArrowLongDown } from "react-icons/hi2";
import { Button } from "@/components/Button";
import { useRouter } from "next/router";

type Props = {};

const HeroItemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

export default function Hero({}: Props) {
  const router = useRouter();

  return (
    <>
      <Container className="relative flex flex-col items-center justify-center gap-4">
        <div className="absolute -top-16">
          <Link
            href="/product/learn-css-by-animated-videos"
            className="inline-block p-2 text-xs rounded-full shadow-md bg-light-blue-2"
          >
            <span className="p-1 mr-2 text-white rounded-full bg-primary">
              New Product
            </span>
            Learn CSS by Animated Videos
          </Link>
        </div>
        {/* Twitter Link + Twitter Activities */}
        <motion.div
          variants={HeroItemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 1 }}
          className="flex gap-4 text-sm"
        >
          <Button
            variant={"twitter"}
            onClick={() =>
              window.open("https://twitter.com/Ali_Developer05")?.focus()
            }
          >
            <AiOutlineTwitter />
            <span>Twitter</span>
          </Button>
          {/* <Button
            variant={"twitter"}
            onClick={() => router.push("/twitter-activity")}
          >
            <span>Twitter Activity</span>
          </Button> */}
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
