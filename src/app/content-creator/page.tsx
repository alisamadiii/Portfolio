"use client";

import React from "react";
import Image from "next/image";

import { containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { ContentCreations } from "@/lib/data";
import ContentSection from "@/components/ContentSection";
import { buttonVariants } from "@/components/ui/button";

export default function ContentCreator() {
  return (
    <div className="space-y-32 overflow-x-hidden">
      <header
        className={containerVariants({
          size: "2xl",
          className:
            "mt-16 grid items-center gap-8 md:mt-0 md:h-screen md:grid-cols-2 md:gap-0",
        })}
      >
        <div className="flex flex-col md:items-start">
          <h1 className="my-4 max-w-4xl text-4xl text-foreground md:text-5xl lg:text-6xl">
            Content Creator
          </h1>
          <Text
            variant={"muted-lg"}
            size={20}
            className="mb-8 max-md:text-base"
          >
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Sequi
            inventore ipsam facilis praesentium ad? Quisquam, eos veritatis
            pariatur sequi vel ad consequatur ipsum assumenda sunt doloremque
            exercitationem consectetur minus maiores.
          </Text>
          <a href="#read-more" className={buttonVariants()}>
            Read more
          </a>
        </div>
        <div className="mask-image">
          <Image src={"/x.png"} width={700} height={700} alt="x-picture" />
        </div>
      </header>

      <main
        className="relative mx-auto max-w-3xl space-y-16 px-6 pb-12"
        id="read-more"
      >
        <div className="pointer-events-none fixed bottom-0 left-0 z-10 h-24 w-full bg-gradient-to-t from-background to-transparent"></div>
        {ContentCreations.map((content) => (
          <ContentSection key={content.id} content={content} />
        ))}
      </main>
    </div>
  );
}
