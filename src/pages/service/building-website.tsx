import React, { useState } from "react";
import { motion } from "framer-motion";

import Meta_Tag from "@/layout/Head";
import Container from "@/layout/Container";
import { Heading2 } from "@/components";
import * as Select from "@/components/Select";

// Icons
import Figma from "@/assets/Technology/figma";
import HTML from "@/assets/Technology/html";
import CSS from "@/assets/Technology/css";
import JS from "@/assets/Technology/js";
import TS from "@/assets/Technology/ts";
import Tailwind from "@/assets/Technology/tailwind";
import Reactjs from "@/assets/Technology/react";
import Nextjs from "@/assets/Technology/next";
import Redux from "@/assets/Technology/redux";
import Firebase from "@/assets/Technology/firebase";

import { Front_End_Services, Testimonial_Service } from "@/contents/Service";
import { Card, PageCounter, Testimonial } from "@/components/Service";
import { Button } from "@/components/Button";
import Video from "@/components/Video";

type Props = {};

const VideoShowcase = [
  {
    id: 1,
    video: "/Service/design-1.mp4",
  },
  {
    id: 2,
    video: "/Service/design-2.mp4",
  },
  {
    id: 3,
    video: "/Service/design-3.mp4",
  },
  {
    id: 4,
    video: "/Service/design-4.mp4",
  },
];

export default function BuildingWebsite({}: Props) {
  const [filterSkills, setFilterSkills] = useState("all");
  const [selectVideo, setSelectVideo] = useState<null | {
    id: number;
    video: string;
  }>(null);

  const SVGSize = "h-12";
  const SVGSize2 = "h-8";

  return (
    <>
      <Meta_Tag title="Service" description="" />
      <div className="pt-24">
        <Container>
          <Heading2 lineUnder={false} className="w-full text-center">
            Building Website
          </Heading2>
          <p className="w-full max-w-[800px] mx-auto text-center">
            Welcome to our Website Building Service, where your online
            aspirations become reality. As a skilled developer, I specialize in
            creating stunning, functional, and fully customized websites that
            align perfectly with your unique needs and goals. From concept to
            completion, I bring your vision to life, ensuring seamless
            navigation, compelling design, and optimal user experience. Let's
            collaborate and build a captivating online presence that sets you
            apart from the competition.
          </p>
          <div className="grid gap-4 my-16 md:grid-cols-2 lg:grid-cols-3">
            {VideoShowcase.map((video) => (
              <motion.video
                layout
                muted
                autoPlay
                loop
                className={`cursor-pointer rounded-xl shadow-container ${
                  selectVideo?.id == video.id
                    ? "col-span-2 row-span-2"
                    : `${selectVideo !== null && "opacity-80"}`
                }`}
                key={video.id}
                onClick={() => {
                  setSelectVideo(video);
                  if (selectVideo?.id == video.id) setSelectVideo(null);
                }}
              >
                <source src={video.video} />
              </motion.video>
            ))}
          </div>
          {/* Big Video
          {selectVideo && (
            <div className="absolute inset-0 z-50 flex items-center justify-center h-screen">
              <div
                onClick={() => setSelectVideo(null)}
                className="absolute inset-0 bg-light-blue-2/30 -z-10"
              />
              <motion.video
                layoutId={selectVideo.id.toString()}
                layout="position"
                muted
                autoPlay
                loop
                className="cursor-pointer rounded-xl w-full max-w-[700px] shadow-container"
                key={selectVideo.id}
              >
                <source src={selectVideo.video} />
              </motion.video>
            </div>
          )} */}
          <section className="mb-16">
            <Heading2 lineUnder={false} className="w-full text-3xl">
              Technologies I am good at
            </Heading2>
            <Select.Select className="my-6">
              <Select.SelectContent
                placeholder="Filter"
                contents={["all", "front-end", "back-end"]}
                value={setFilterSkills}
              />
            </Select.Select>
            <div className="flex flex-wrap items-center gap-6">
              {filterSkills == "all" ? (
                <>
                  <Figma className={SVGSize} />
                  <HTML className={SVGSize} />
                  <CSS className={SVGSize} />
                  <JS className={SVGSize} />
                  <TS className={SVGSize} />
                  <Tailwind className={SVGSize} />
                  <Reactjs className={SVGSize} />
                  <Nextjs className={SVGSize} />
                  <Redux className={SVGSize} />
                  <Firebase className={SVGSize} />
                </>
              ) : filterSkills == "front-end" ? (
                <>
                  <Figma className={SVGSize} />
                  <HTML className={SVGSize} />
                  <CSS className={SVGSize} />
                  <JS className={SVGSize} />
                  <TS className={SVGSize} />
                  <Tailwind className={SVGSize} />
                  <Reactjs className={SVGSize} />
                  <Nextjs className={SVGSize} />
                  <Redux className={SVGSize} />
                </>
              ) : (
                <>
                  <Nextjs className={SVGSize} />
                  <Firebase className={SVGSize} />
                </>
              )}
            </div>
          </section>
          <section>
            <Heading2 lineUnder={false} className="w-full text-3xl">
              Front-End Developer
            </Heading2>
            {/* button */}
            <PageCounter />
            <div className="flex flex-wrap gap-4">
              {Front_End_Services.map((service) => (
                <Card key={service.level} service={service} />
              ))}
            </div>
          </section>
          <section className="my-16">
            <Heading2 lineUnder={false} className="w-full text-3xl">
              Full-Stack Developer
            </Heading2>
            <div className="grid gap-4 mt-12 md:grid-cols-2">
              <div>
                <p className="md:text-xl">
                  In today's digital world, a captivating online presence is
                  crucial for success. Introducing this section, where we bring
                  your vision to life with our exceptional full stack web
                  development service!
                </p>
                <div className="flex flex-wrap items-center gap-4 my-4">
                  <Figma className={SVGSize2} />
                  <JS className={SVGSize2} />
                  <TS className={SVGSize2} />
                  <Tailwind className={SVGSize2} />
                  <Nextjs className={SVGSize2} />
                  <Redux className={SVGSize2} />
                  <Firebase className={SVGSize2} />
                </div>
                <Button
                  onClick={() =>
                    window.open("https://twitter.com/Ali_Developer05")?.focus()
                  }
                >
                  Contact Now
                </Button>
              </div>
              <div className="overflow-hidden rounded-xl shadow-container">
                <Video
                  path="/Service - Full Stack Developer.mp4"
                  poster="https://images.unsplash.com/photo-1504639725590-34d0984388bd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80"
                />
              </div>
            </div>
          </section>
          <section>
            <Heading2 lineUnder={false} className="w-full text-3xl">
              what clients are saying
            </Heading2>
            <div className="grid mt-12 grid-flow-col gap-4 auto-cols-[90%] md:auto-cols-[368px] overflow-x-auto scroll-bar snap-x snap-mandatory py-4">
              {Testimonial_Service.map((testimonial) => (
                <Testimonial key={testimonial.id} testimonial={testimonial} />
              ))}
            </div>
          </section>
        </Container>
      </div>
    </>
  );
}
