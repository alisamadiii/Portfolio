"use client";

import React, { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";

import { Button, buttonVariants } from "@/components/ui/button";
import { Container, containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import Technologies from "@/components/technologies";
import { FrequentlyAskedQuestions, Pricing, Testimonials } from "@/lib/data";
import Price from "@/components/Price";
import { useToast } from "@/components/ui/use-toast";

export default function BuildingWebsite() {
  const { toast } = useToast();

  const [allTestimonials, setAllTestimonials] = useState(false);

  const UnderConstruction = () => {
    toast({
      title: "Under Construction",
      description: "",
      variant: "destructive",
    });
  };

  const demosContainer = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: demosContainer,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], [300, 0]);
  const xReverse = useTransform(scrollYProgress, [0, 2], [0, 400]);

  return (
    <main className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute -z-10 h-96 w-96 scale-[0.85] rounded-[100%] border border-gradient-1-from max-2xl:right-0 max-2xl:top-60 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 2xl:h-[calc(100vh*2)] 2xl:w-full 2xl:-translate-y-1/2"
        id="line-animation"
      />
      <div
        className="pointer-events-none absolute -z-10 h-96 w-96 scale-90 rounded-[100%] border border-gradient-1-from max-2xl:right-0 max-2xl:top-60 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 2xl:h-[calc(100vh*2)] 2xl:w-full 2xl:-translate-y-1/2"
        id="line-animation"
      />
      <div
        className="pointer-events-none absolute -z-10 h-96 w-96 scale-95 rounded-[100%] border border-gradient-1-from max-2xl:right-0 max-2xl:top-60 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 2xl:h-[calc(100vh*2)] 2xl:w-full 2xl:-translate-y-1/2"
        id="line-animation"
      />
      <div
        className="pointer-events-none absolute -z-10 h-96 w-96 rounded-[100%] border border-gradient-1-from max-2xl:right-0 max-2xl:top-60 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 2xl:h-[calc(100vh*2)] 2xl:w-full 2xl:-translate-y-1/2"
        id="line-animation"
      />
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "tween", ease: "backOut" }}
        className={containerVariants({
          size: "xl",
          className:
            "flex flex-col items-center justify-center overflow-hidden max-md:mt-16 max-md:py-20 md:h-dvh",
        })}
      >
        <Badge className="flex items-center gap-2 px-4">
          <div className="before: relative h-2 w-2 rounded-full bg-success before:absolute before:h-full before:w-full before:animate-badge-circle-expand before:rounded-full before:bg-success" />
          Currently having a Client
        </Badge>
        <h1 className="my-4 max-w-4xl text-center text-4xl text-foreground md:text-5xl lg:text-6xl">
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
      </motion.header>

      <Container size={"xl"} className="my-28 space-y-16">
        <section
          className="flex flex-col items-center gap-16"
          ref={demosContainer}
        >
          <Badge>Demos</Badge>
          <div className="space-y-4">
            <motion.div style={{ x }} className="flex justify-center gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((_, index) => (
                <Image
                  key={index}
                  src="/project demo.png"
                  width={400}
                  height={300}
                  alt="project demo"
                />
              ))}
            </motion.div>
            <motion.div
              style={{ x: xReverse }}
              className="flex justify-center gap-2"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((_, index) => (
                <Image
                  key={index}
                  src="/project demo.png"
                  width={400}
                  height={300}
                  alt="project demo"
                />
              ))}
            </motion.div>
          </div>
        </section>
        <section className="flex flex-col items-center gap-16">
          <Badge>Experience</Badge>
          <Technologies />
        </section>
        <section className="flex flex-col items-center gap-16">
          <Badge>Pricing</Badge>
          <div className="flex w-full flex-wrap gap-6">
            {Pricing.map((price) => (
              <Price key={price.id} price={price} />
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
            className={`grid gap-6 overflow-hidden [--height:700px] md:grid-cols-2 md:[--height:400px] ${
              !allTestimonials && "fade-out-faq"
            }`}
            initial={{ height: "var(--height)" }}
            animate={{ height: allTestimonials ? "auto" : "var(--height)" }}
            transition={{ duration: 0.3 }}
          >
            {FrequentlyAskedQuestions.map((question) => (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                key={question.id}
                className="space-y-2"
              >
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
              </motion.div>
            ))}
          </motion.div>
          <Button
            size={"sm"}
            onClick={() => {
              setAllTestimonials(!allTestimonials);
            }}
            className={`${!allTestimonials && "-translate-y-12"}`}
          >
            {allTestimonials ? "show less" : "show more"}
          </Button>
        </section>
      </Container>

      <Container
        size={"2xl"}
        className="fade-out-testimonial relative flex flex-col items-center gap-16 overflow-hidden"
      >
        <Badge>what clients are saying</Badge>
        <div className="group flex items-start gap-11">
          {Testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="w-full max-w-md animate-testimonial space-y-6 rounded-xl border bg-background p-8 text-center md:max-w-testimonial"
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
              className="w-full max-w-md animate-testimonial space-y-6 rounded-xl border p-8 text-center md:max-w-testimonial"
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
              className={`max-w-4xl bg-gradient-to-tr from-gradient-1-from to-gradient-1-to bg-clip-text text-center text-5xl text-transparent lg:text-6xl`}
            >
              Client
            </Text>
            <Text
              size={20}
              variant={"muted-lg"}
              className="line-clamp-2 font-normal"
            >
              If you&apos;re in need of a website builder, please provide us
              with your information.
            </Text>
          </div>
          <div className="flex flex-col items-center gap-2 md:items-end md:gap-4">
            <div className="rounded bg-gradient-to-r from-gradient-1-from to-gradient-1-to p-0.5 px-0">
              <button
                // href={"#"}
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  className: "inline-block",
                })}
                onClick={UnderConstruction}
              >
                Send now
              </button>
            </div>
          </div>
        </Container>
      </Container>
    </main>
  );
}
