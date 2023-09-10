"use client";

import React, { useEffect, useState } from "react";
import { Text } from "./ui/text";
import { gsap } from "gsap";
import { RotateDraggableCobe } from "./cobe/RotateDraggable";
import { AnimatePresence, Variants, motion } from "framer-motion";
import { Button, buttonVariants } from "./ui/button";

type Props = {};

const earthRotating: Variants = {
  initial: { scale: 0.2, y: -100 },
  animate: { scale: 1.5, y: 500 },
};

export default function Intro({}: Props) {
  const [rotateEarth, setRotateEarth] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setRotateEarth(false);
    }, 5000);
  }, []);

  useEffect(() => {
    const first = document.querySelector("#first");
    const second = document.querySelector("#second");
    const third = document.querySelector("#third");
    const forth = document.querySelector("#forth");

    const tl = gsap.timeline();

    tl.from(first, {
      opacity: 0,
      y: 20,
      delay: 1,
    })
      .to(
        first,
        {
          opacity: 0,
          y: -20,
        },
        "+=1"
      )
      .from(second, {
        opacity: 0,
        y: 20,
      })
      .to(
        second,
        {
          opacity: 0,
          y: -20,
        },
        "+=1"
      )
      .from(third, {
        opacity: 0,
        y: 20,
      })
      .to(
        third,
        {
          opacity: 0,
          y: -20,
        },
        "+=1"
      )
      .from(forth, {
        opacity: 0,
        y: 20,
      });
  }, []);

  return (
    <div className="relative flex items-center justify-center w-full h-screen overflow-hidden isolate">
      <Text size={32} className="absolute" id="first">
        Hey
      </Text>
      <Text size={32} className="absolute" id="second">
        I am Ali Reza
      </Text>
      <Text size={32} className="absolute" id="third">
        I am a Web developer
      </Text>
      <Button size={"lg"} className="absolute" id="forth">
        Explore now
      </Button>
      <AnimatePresence initial={false}>
        <motion.div
          variants={earthRotating}
          animate={rotateEarth ? "initial" : "animate"}
          transition={{ duration: 1.5, ease: "backOut" }}
          className="w-full aspect-square max-w-[600px] m-auto"
        >
          <RotateDraggableCobe className="earth" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
