"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

import * as Choicebox from "@/components/choicebox";

import { Button } from "@/components/ui/button";
import { Container, containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import Technologies from "@/components/technologies";
import { FrequentlyAskedQuestions, Pricing, Testimonials } from "@/lib/data";
import CustomIcon from "@/assets/CustomIcon";

type Props = {};

export default function BuildingWebsite({}: Props) {
  const [selectedOption, setSelectedOption] = React.useState<null | string>(
    "1"
  );
  const [allTestimonials, setAllTestimonials] = useState(false);

  const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedOption(event.target.value);
  };

  return (
    <main className="relative overflow-hidden">
      <div
        className="absolute max-2xl:top-60 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100vh*2)] scale-[0.85] 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
        id="line-animation"
      />
      <div
        className="absolute max-2xl:top-60 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100vh*2)] scale-90 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
        id="line-animation"
      />
      <div
        className="absolute max-2xl:top-60 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100vh*2)] scale-95 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
        id="line-animation"
      />
      <div
        className="absolute max-2xl:top-60 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100vh*2)] 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
        id="line-animation"
      />
      <header
        className={containerVariants({
          size: "xl",
          className:
            "flex flex-col items-center justify-center max-md:py-20 max-md:mt-16 md:h-dvh overflow-hidden",
        })}
      >
        <h1 className="max-w-4xl my-4 text-4xl text-center md:text-5xl lg:text-6xl text-foreground">
          Building Website
        </h1>
        <Text
          variant={"muted-lg"}
          size={20}
          className="mb-8 text-center max-md:text-base"
        >
          Welcome to our Website Building Service, where your online aspirations
          become reality. As a skilled developer, I specialize in creating
          stunning, functional, and fully customized websites that align
          perfectly with your unique needs and goals. From concept to
          completion, I bring your vision to life, ensuring seamless navigation,
          compelling design, and optimal user experience. Let&apos;s collaborate
          and build a captivating online presence that sets you apart from the
          competition.
        </Text>
        <Button size={"lg"} className="max-md:w-full max-md:max-w-md">
          Know me more!
        </Button>
      </header>

      <Container size={"xl"} className="space-y-16 my-28">
        <section className="flex flex-col items-center gap-16">
          <Badge>Experience</Badge>
          <Technologies />
        </section>
        <section className="flex flex-col items-center gap-16">
          <Badge>Pricing</Badge>
          <div className="flex flex-wrap w-full gap-6">
            {Pricing.map((price) => (
              <Choicebox.Group
                key={price.id}
                className="flex gap-4 grow basis-56"
              >
                <Choicebox.Item
                  name="choicebox"
                  value={price.id.toString()}
                  checked={selectedOption == price.id.toString()}
                  onChange={handleRadioChange}
                >
                  <div className="flex justify-between">
                    <Text
                      as="h3"
                      size={24}
                      className={`${
                        selectedOption == price.id.toString() &&
                        "text-foreground"
                      }`}
                    >
                      {price.title}
                    </Text>
                    <div className="-space-y-1 text-right">
                      <Text as="h3" size={16}>
                        ${price.price}
                      </Text>
                      <Text as="h3" size={10}>
                        per page
                      </Text>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Text as="h3" size={16} className="flex items-center gap-4">
                      Design{" "}
                      <CustomIcon
                        icon={price.job.design ? "service" : "no-service"}
                      />
                    </Text>
                    <Text as="h3" size={16} className="flex items-center gap-4">
                      Coding{" "}
                      <CustomIcon
                        icon={price.job.coding ? "service" : "no-service"}
                      />
                    </Text>
                    <Text as="h3" size={16} className="flex items-center gap-4">
                      Animation{" "}
                      <CustomIcon
                        icon={price.job.animation ? "service" : "no-service"}
                      />
                    </Text>
                  </div>
                </Choicebox.Item>
              </Choicebox.Group>
            ))}
          </div>
          <article className="flex flex-col items-center gap-8 text-center">
            <Text variant={"space-grotesk"}>
              In today&apos;s digital world, a captivating online presence is
              crucial for success. Introducing this where we bring your vision
              to life with our exceptional full stack web development service!
            </Text>
            <Button size={"md"} className="max-md:w-full max-md:max-w-md">
              Contact now
            </Button>
          </article>
        </section>

        <section className="flex flex-col items-center gap-16">
          <Badge>frequently asked questions</Badge>
          <motion.div
            className={`grid gap-6 md:grid-cols-2 [--height:700px] md:[--height:400px] ${
              !allTestimonials && "fade-out-faq"
            }`}
            initial={{ height: "var(--height)" }}
            animate={{ height: allTestimonials ? "auto" : "var(--height)" }}
          >
            {FrequentlyAskedQuestions.map((question) => (
              <div key={question.id} className="space-y-2">
                <Text size={14} className="font-medium text-foreground">
                  {question.question}
                </Text>
                <Text
                  size={14}
                  dangerouslySetInnerHTML={{
                    __html: question.answer
                      .replaceAll(
                        /@(\w+)/g,
                        '<span class="text-success font-bold">@$1</span>'
                      )
                      .replaceAll("@", ""),
                  }}
                />
              </div>
            ))}
          </motion.div>
          <Button
            size={"sm"}
            onClick={() => setAllTestimonials(!allTestimonials)}
            className={`${!allTestimonials && "-translate-y-12"}`}
          >
            {allTestimonials ? "show less" : "show more"}
          </Button>
        </section>
      </Container>

      <Container
        size={"2xl"}
        className="relative flex flex-col items-center gap-16 overflow-hidden fade-out-testimonial"
      >
        <Badge>what clients are saying</Badge>
        <div className="flex items-start gap-11 group">
          {Testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="w-full max-w-md p-8 space-y-6 text-center border md:max-w-testimonial rounded-xl animation-testimonial bg-background"
              style={{ flex: "0 0 auto" }}
            >
              <Text className="text-lg leading-8 text-foreground md:text-2xl">
                {testimonial.testimonial}
              </Text>
              <Text size={16} variant={"space-grotesk"}>
                {testimonial.headline}
              </Text>
              <Text size={24} className="text-foreground">
                {testimonial.from}
              </Text>
            </div>
          ))}
          {Testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="w-full max-w-md p-8 space-y-6 text-center border md:max-w-testimonial rounded-xl animation-testimonial"
              style={{ flex: "0 0 auto" }}
            >
              <Text className="text-lg leading-8 text-foreground md:text-2xl">
                {testimonial.testimonial}
              </Text>
              <Text size={16} variant={"space-grotesk"}>
                {testimonial.headline}
              </Text>
              <Text size={24} className="text-foreground">
                {testimonial.from}
              </Text>
            </div>
          ))}
        </div>
      </Container>

      <Container
        size={"2xl"}
        className="relative mt-32 overflow-hidden isolate"
      >
        <div className="absolute top-0 left-0 z-20 w-full h-px bg-gradient-to-l from-transparent via-white to-transparent" />
        <div
          className="absolute inset-0 w-full h-full -z-10 opacity-10"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 0,rgba(255, 255, 255,.5) 0,rgba(255, 255, 255,0) 100%)",
          }}
        />
        <Container
          size={"xl"}
          className="grid items-center gap-8 py-32 text-center md:text-start md:grid-cols-3"
        >
          <div className="flex flex-col items-center gap-2 md:items-start md:col-span-2">
            <Text
              className={`max-w-4xl text-center text-5xl lg:text-6xl text-transparent bg-gradient-to-tr bg-clip-text from-gradient-1-from to-gradient-1-to`}
            >
              Client
            </Text>
            <Text
              size={20}
              variant={"muted-lg"}
              className="font-normal line-clamp-2"
            >
              If you are looking for someone to build a website then send us
              your information
            </Text>
          </div>
          <div className="flex flex-col items-center gap-2 md:gap-4 md:items-end">
            <div className="p-0.5 rounded bg-gradient-to-r from-gradient-1-from to-gradient-1-to w-32 px-0">
              <Button
                variant={"primary"}
                size={"lg"}
                className="w-full px-0"
                // onClick={UnderConstruction}
              >
                Here
              </Button>
            </div>
          </div>
        </Container>
      </Container>
    </main>
  );
}
