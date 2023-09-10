"use client";

import React, { useEffect } from "react";
import { Text } from "./ui/text";
import { gsap } from "gsap";
import { AutoRotateCobe } from "./cobe/AutoRotate";

type Props = {};

export default function Intro({}: Props) {
  useEffect(() => {
    const first = document.querySelector("#first");
    const second = document.querySelector("#second");
    const third = document.querySelector("#third");
    const earth = document.querySelector(".earth");

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
      .to(earth, {
        scale: 4,
        opacity: 0,
        duration: 3,
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
      <AutoRotateCobe className="-z-50 earth" />
    </div>
  );
}
