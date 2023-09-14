"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import SplitType from "split-type";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";

import { containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import NumberGradient from "@/components/number-gradient";

// Icons
import TechIcon from "@/assets/Tech.icon";
import { AiFillGithub, AiFillLinkedin } from "react-icons/ai";
import { Experience } from "@/lib/data";

export default function Home() {
  const [gradientColor, setGradientColor] = useState(1);

  gsap.registerPlugin(ScrollTrigger);

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update the gradientColor value here
      setGradientColor((prevColor) => (prevColor % 3) + 1);
    }, 2000); // 1000 milliseconds = 1 second

    // To stop the looped function when the component unmounts
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    (async () => {
      // @ts-ignore
      const LocomotiveScroll = (await import("locomotive-scroll")).default;
      const locomotiveScroll = new LocomotiveScroll();
    })();
  }, []);

  useEffect(() => {
    const splitTypes = document.querySelectorAll("#reveal-text");

    splitTypes.forEach((char: any) => {
      const text = new SplitType(char, { types: "chars, words" });

      gsap
        .from(text.chars, {
          scrollTrigger: {
            trigger: char,
            start: "top 80%",
            end: "top: 0%",
            // scrub: true,
          },
          color: "black",
          opacity: 1,
          stagger: 0.2,
        })
        .duration(1.5);
    });
  }, []);

  return (
    <main>
      <header
        className={containerVariants({
          size: "xl",
          className:
            "flex flex-col items-center justify-center max-md:py-20 max-md:mt-16 md:h-dvh",
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
              <AiFillLinkedin />
            </Button>
            <Button size={"lg"} className="w-full px-4">
              <AiFillGithub />
            </Button>
          </div>
        </div>
      </header>

      <div className="px-6 space-y-32">
        <section className="flex flex-col items-center space-y-6">
          <Text variant={"section-name"}>explore about me</Text>
          <NumberGradient gradient={1} number={1} title="About" />
          <Text
            variant={"muted-lg"}
            size={20}
            className="max-w-3xl mb-8 text-center max-md:text-base"
            id="reveal-text"
          >
            I&apos;m Ali Reza! I&apos;ve got 2+ years of web dev experience,
            mainly focusing on front-end magic with ReactJS. I&apos;m all about
            embracing new challenges and learning opportunities. Let&apos;s
            build something awesome together!
          </Text>
        </section>

        <section className="flex flex-col items-center space-y-6">
          <Text variant={"section-name"}>experience with</Text>
          <TechIcon />
        </section>

        <section>
          <NumberGradient gradient={2} number={2} title="Projects" />
        </section>

        <section className="space-y-20">
          <NumberGradient gradient={3} number={3} title="My Experience" />
          <VerticalTimeline lineColor="">
            {Experience.map((value) => (
              <React.Fragment key={value.id}>
                <VerticalTimelineElement
                  contentStyle={{
                    background: "#0A0A0A",
                    border: "0.5px solid rgba(255, 255, 255, .20)",
                    boxShadow: "none",
                    borderRadius: "12px",
                  }}
                  contentArrowStyle={{
                    display: "none",
                  }}
                  date={value.date}
                  icon={value.icon}
                  iconStyle={{
                    background: "black",
                    fontSize: "15rem",
                    boxShadow: "none",
                  }}
                  dateClassName="date"
                >
                  <Text as="h3" size={24}>
                    {value.title}
                  </Text>
                  <Text variant={"muted-sm"} className="!mt-1 !text-xs">
                    {value.subtitle}
                  </Text>
                  <Text
                    className="!mt-2 !text-sm !leading-6"
                    variant={"muted-sm"}
                  >
                    {value.description}
                  </Text>
                </VerticalTimelineElement>
              </React.Fragment>
            ))}
          </VerticalTimeline>
        </section>
      </div>
    </main>
  );
}
