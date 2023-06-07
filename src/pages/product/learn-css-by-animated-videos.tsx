import React from "react";
import { motion } from "framer-motion";

import Container from "@/layout/Container";

type Props = {};

import ProductImage from "../../assets/Learn CSS by Animated Videos.png";
import Image from "next/image";
import Meta_Tag from "@/layout/Head";
import { AiOutlineArrowLeft } from "react-icons/ai";
import Link from "next/link";

export default function AnimatedVideos({}: Props) {
  return (
    <>
      <Meta_Tag
        title="Learn CSS by Animated Videos"
        description="Step into a mesmerizing world of animation and creativity with this curated collection of animated content links! This Notion file serves as a gateway to a treasure trove of visually stunning and captivating videos, carefully sourced from Twitter's vibrant animation community."
      />
      <motion.div
        initial={{
          clipPath: "polygon(0 0, 100% 0, 100% 0%, 0% 0%)",
          opacity: 0,
        }}
        animate={{
          clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
          opacity: 1,
        }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center h-full overflow-hidden bg-white shadow-2xl rounded-xl md:rounded-3xl"
      >
        <Link
          href={"/"}
          className="absolute flex items-center gap-2 top-4 left-4"
        >
          <AiOutlineArrowLeft />
          back
        </Link>
        <Container className="grid items-center gap-12 py-8 md:grid-cols-2">
          <div>
            <div className="overflow-hidden md:py-2">
              <motion.h1
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: "tween", delay: 0.5 }}
                className="text-xl font-bold md:text-4xl"
              >
                Learn CSS by Animated Videos
              </motion.h1>
            </div>
            <div className="overflow-hidden md:py-2">
              <motion.p
                initial={{ y: 200 }}
                animate={{ y: 0 }}
                transition={{ type: "tween", delay: 0.7 }}
                className="mt-1 mb-2 text-sm md:mt-2 md:mb-4 md:text-base"
              >
                Step into a mesmerizing world of animation and creativity with
                this curated collection of animated content links! This Notion
                file serves as a gateway to a treasure trove of visually
                stunning and captivating videos, carefully sourced from
                Twitter's vibrant animation community.
              </motion.p>
            </div>
            <a
              href="https://alireza05.gumroad.com/l/learn-css-by-animated-videos/ali83"
              target="_blank"
              className="inline-block px-4 py-2 text-sm font-medium text-white rounded-md md:text-base bg-primary hover:bg-primary/80"
            >
              Buy Now ($6)
            </a>
          </div>
          <motion.div
            className="p-8 bg-light-blue-2 rounded-3xl"
            initial={{
              clipPath: "polygon(0 0, 100% 0, 100% 0%, 0% 0%)",
              scale: 1.1,
            }}
            animate={{
              clipPath: "polygon(0 0, 100% 0, 100% 100%, 0% 100%)",
              scale: 1,
            }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Image
              src={ProductImage}
              width={700}
              height={700}
              alt="product image"
              className="w-full max-w-[300px] md:max-w-[400px] mx-auto shadow-xl rounded-2xl"
            />
          </motion.div>
        </Container>
      </motion.div>
    </>
  );
}
