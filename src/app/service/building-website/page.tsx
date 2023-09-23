import React from "react";

import { Button } from "@/components/ui/button";
import { containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";

type Props = {};

export default function BuildingWebsite({}: Props) {
  return (
    <main className="relative overflow-hidden">
      <div
        className="absolute max-2xl:bottom-0 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100%*2)] scale-[0.85] 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
        id="line-animation"
      />
      <div
        className="absolute max-2xl:bottom-0 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100%*2)] scale-90 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
        id="line-animation"
      />
      <div
        className="absolute max-2xl:bottom-0 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100%*2)] scale-95 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
        id="line-animation"
      />
      <div
        className="absolute max-2xl:bottom-0 max-2xl:right-0 max-2xl:translate-x-1/2 max-2xl:translate-y-1/2 w-96 2xl:w-full h-96 2xl:h-[calc(100%*2)] 2xl:-translate-y-1/2 border rounded-[100%] pointer-events-none border-gradient-1-from -z-10"
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
    </main>
  );
}
