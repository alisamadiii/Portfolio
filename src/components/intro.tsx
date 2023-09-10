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

  const clickHandler = () => {
    const container = document.querySelector("#container");
    const circleWhite = document.querySelector("#circle-white");
    const circleBlack = document.querySelector("#circle-black");
    const circleSuccess = document.querySelector("#circle-success");
    const circleError = document.querySelector("#circle-error");
    const circleViolet = document.querySelector("#circle-violet");
    const circleCyan = document.querySelector("#circle-cyan");
    const circleWhite2 = document.querySelector("#circle-white-2");
    const button = document.querySelector("#forth");

    const tl = gsap.timeline();

    gsap.to(button, {
      scale: 1.5,
      duration: 5,
    });

    tl.to(
      circleWhite,
      {
        height: "100vh",
        duration: 0.5,
      },
      "+=.5"
    )
      .to(
        circleBlack,
        {
          height: "100vh",
          duration: 0.4,
        },
        "+=.1"
      )
      .to(
        circleSuccess,
        {
          height: "100vh",
          duration: 0.3,
        },
        "+=.1"
      )
      .to(
        circleError,
        {
          height: "100vh",
          duration: 0.2,
        },
        "+=.1"
      )
      .to(
        circleViolet,
        {
          height: "100vh",
          duration: 0.2,
        },
        "+=.1"
      )
      .to(
        circleCyan,
        {
          height: "100vh",
          duration: 0.2,
        },
        "+=.1"
      )
      .to(
        circleWhite2,
        {
          height: "100vh",
          duration: 0.5,
        },
        "-=.1"
      )
      .to(
        container,
        {
          height: "0vh",
        },
        "+=.3"
      );
  };

  return (
    <div
      className="fixed top-0 left-0 z-50 flex items-center justify-center w-full h-screen overflow-hidden bg-black isolate"
      id="container"
    >
      <div className="absolute top-0 w-full bg-white" id="circle-white" />
      <div className="absolute top-0 w-full bg-black" id="circle-black" />
      <div className="absolute top-0 w-full bg-success" id="circle-success" />
      <div className="absolute top-0 w-full bg-error" id="circle-error" />
      <div className="absolute top-0 w-full bg-violet" id="circle-violet" />
      <div className="absolute top-0 w-full bg-cyan" id="circle-cyan" />
      <div className="absolute bottom-0 w-full bg-white" id="circle-white-2" />
      <Text size={32} className="absolute" id="first">
        Hey
      </Text>
      <Text size={32} className="absolute" id="second">
        I am Ali Reza
      </Text>
      <Text size={32} className="absolute" id="third">
        I am a Web developer
      </Text>
      <Button
        size={"lg"}
        className="absolute"
        id="forth"
        onClick={clickHandler}
      >
        Explore now
      </Button>
    </div>
  );
}
