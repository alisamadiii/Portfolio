"use client";

import React from "react";
import Image from "next/image";

import { containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";

export default function ContentCreator() {
  return (
    <div>
      <header
        className={containerVariants({
          size: "2xl",
          className:
            "mt-16 grid items-center md:mt-0 md:h-screen md:grid-cols-2",
        })}
      >
        <div>
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
        </div>
        <div className="mask-image">
          <Image src={"/x.png"} width={700} height={700} alt="x-picture" />
        </div>
      </header>
    </div>
  );
}
