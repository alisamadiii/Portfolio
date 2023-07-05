import React from "react";

import Meta_Tag from "@/layout/Head";
import Container from "@/layout/Container";
import { Heading2 } from "@/components";

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

import { Front_End_Services } from "@/contents/Service";
import Counter from "@/components/AnimatedCounter";
import { Button } from "@/components/Button";
import { usePagePriceStore } from "@/context/PagePrice";

import { Card, PageCounter } from "@/components/Service";

type Props = {};

export default function BuildingWebsite({}: Props) {
  const { pagePrice } = usePagePriceStore();

  return (
    <>
      <Meta_Tag title="Service" description="" />
      <div className="py-24">
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
          <section className="my-16">
            <Heading2 lineUnder={false} className="w-full text-3xl">
              Technologies I am good at
            </Heading2>
            <div className="flex flex-wrap items-center gap-6 mt-12">
              <Figma />
              <HTML />
              <CSS />
              <JS />
              <TS />
              <Tailwind />
              <Reactjs />
              <Nextjs />
              <Redux />
              <Firebase />
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
        </Container>
      </div>
    </>
  );
}
