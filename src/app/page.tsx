"use client";

import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import SplitType from "split-type";
import {
  VerticalTimeline,
  VerticalTimelineElement,
} from "react-vertical-timeline-component";
import "react-vertical-timeline-component/style.min.css";
import { motion, useScroll, useTransform } from "framer-motion";
import { useInView } from "react-intersection-observer";

import { Container, containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import NumberGradient from "@/components/number-gradient";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import { AiFillGithub, AiFillLinkedin } from "react-icons/ai";

import { Experience } from "@/lib/data";
import { useToast } from "@/components/ui/use-toast";
import Technologies from "@/components/technologies";
import Project from "@/components/project";
import { supabase } from "@/utils/supabase";

export default function Home() {
  const { toast } = useToast();
  const { ref: projects, inView } = useInView({
    /* Optional options */
    threshold: 0,
  });

  const [projectsData, setProjectsData] = useState<any>(null);

  const [gradientColor, setGradientColor] = useState(1);

  gsap.registerPlugin(ScrollTrigger);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setGradientColor((prevColor) => (prevColor % 3) + 1);
    }, 2000); // 1000 milliseconds = 1 second

    return () => {
      clearInterval(intervalId);
    };
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

  const UnderConstruction = () => {
    toast({
      title: "Under Construction",
      description: "",
      variant: "destructive",
    });
  };

  const headerContainer = useRef<null | HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: headerContainer,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  useEffect(() => {
    const fetchingProjects = async () => {
      if (!inView) { console.log("not-fetching"); return; }

      console.log("fetching");
      const { data } = await supabase.from("project").select("*");

      setProjectsData(data);
      console.log("done");
    };

    fetchingProjects();
  }, [inView]);

  return (
    <main>
      <div className="absolute top-1/2 -z-50 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/5 blur-[100px]" />

      <motion.header
        style={{ y, opacity, scale }}
        className={containerVariants({
          size: "xl",
          className:
            "flex flex-col items-center justify-center overflow-hidden max-md:mt-16 max-md:py-20 md:h-dvh",
        })}
        ref={headerContainer}
      >
        <Image src={"/Logo.png"} width={60} height={60} alt="logo" />
        <h1 className="my-4 max-w-4xl text-center text-4xl text-foreground md:text-5xl lg:text-6xl">
          Experienced web developer specializing in{" "}
          <span
            className={`bg-gradient-to-tr bg-clip-text text-transparent ${
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
        <div className="flex w-full flex-col items-center justify-center gap-3 md:flex-row md:gap-5">
          <div className="rounded bg-gradient-to-r from-gradient-1-from to-gradient-1-to p-0.5 max-md:w-full max-md:max-w-md">
            <Button
              variant={"primary"}
              size={"lg"}
              className="max-md:w-full max-md:max-w-md"
              onClick={UnderConstruction}
            >
              Contact me
            </Button>
          </div>
          <Button
            size={"lg"}
            className="max-md:w-full max-md:max-w-md"
            onClick={UnderConstruction}
          >
            Download CV
          </Button>
          <div className="flex gap-3 max-md:w-full max-md:max-w-md md:gap-5">
            <Button
              size={"lg"}
              className="w-full px-4"
              onClick={UnderConstruction}
            >
              <AiFillLinkedin />
            </Button>
            <Button
              size={"lg"}
              className="w-full px-4"
              onClick={UnderConstruction}
            >
              <AiFillGithub />
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="space-y-32 px-6">
        <section className="flex flex-col items-center space-y-6" id="about">
          <Text size={12} variant={"section-name"}>
            explore about me
          </Text>
          <NumberGradient gradient={1} number={1} title="About" />
          <Text
            size={20}
            variant={"muted-lg"}
            className="mb-8 max-w-3xl text-center leading-8 max-md:text-base"
            id="reveal-text"
          >
            I&apos;m Ali Reza! I&apos;ve got 2+ years of web dev experience,
            mainly focusing on front-end magic with ReactJS. I&apos;m all about
            embracing new challenges and learning opportunities. Let&apos;s
            build something awesome together!
          </Text>
        </section>

        <section className="flex flex-col items-center space-y-6">
          <Text size={12} variant={"section-name"}>
            experience with
          </Text>
          <Technologies />
        </section>

        <section className="space-y-6" id="project" ref={projects}>
          <NumberGradient gradient={2} number={2} title="Projects" />
          <ul className={containerVariants({ size: "xl" })}>
            {projectsData ? (
              projectsData.map((project: any) => (
                <Project key={project.id} project={project} />
              ))
            ) : (
              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-48 rounded-xl" />
                  <Skeleton className="h-4 w-8 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-2 w-48 rounded-xl" />
                  <Skeleton className="h-2 w-48 rounded-xl" />
                  <Skeleton className="h-2 w-24 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-24 rounded-xl" />
              </div>
            )}
          </ul>
        </section>

        <section className="space-y-20 overflow-hidden" id="experience">
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
                  <Text
                    size={12}
                    variant={"muted-sm"}
                    className="!mt-1 !text-xs"
                  >
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

      <Container
        size={"2xl"}
        className="relative isolate mt-32 overflow-hidden"
      >
        <div className="absolute left-0 top-0 z-20 h-px w-full bg-gradient-to-l from-transparent via-white to-transparent" />
        <div
          className="absolute inset-0 -z-10 h-full w-full opacity-10"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 0,rgba(255, 255, 255,.5) 0,rgba(255, 255, 255,0) 100%)",
          }}
        />
        <Container
          size={"xl"}
          className="grid items-center gap-8 py-32 text-center md:grid-cols-3 md:text-start"
        >
          <div className="flex flex-col items-center gap-2 md:col-span-2 md:items-start">
            <Text
              className={`max-w-4xl bg-gradient-to-tr bg-clip-text text-center text-5xl text-transparent lg:text-6xl ${
                gradientColor === 1
                  ? "from-gradient-1-from to-gradient-1-to"
                  : gradientColor === 2
                  ? "from-gradient-2-from to-gradient-2-to"
                  : "from-gradient-3-from to-gradient-3-to"
              }`}
            >
              Service
            </Text>
            <Text
              size={20}
              variant={"muted-lg"}
              className="line-clamp-2 font-normal"
            >
              Embark on a streamlined digital journey with our Service Route.
            </Text>
          </div>
          <div className="flex flex-col items-center gap-2 md:items-end md:gap-4">
            <Button
              size={"lg"}
              className="w-32 px-0"
              onClick={UnderConstruction}
            >
              Check out
            </Button>
            <div className="w-32 rounded bg-gradient-to-r from-gradient-1-from to-gradient-1-to p-0.5 px-0">
              <Button
                variant={"primary"}
                size={"lg"}
                className="w-full px-0"
                onClick={UnderConstruction}
              >
                Read more
              </Button>
            </div>
          </div>
        </Container>
      </Container>
    </main>
  );
}
