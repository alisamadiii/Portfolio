"use client";

import React from "react";
import Image from "next/image";

import { Container, containerVariants } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { ContentCreations } from "@/lib/data";
import ContentSection from "@/components/ContentSection";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
        {/* <div className="space-y-8">
          <Skeleton className="h-12 w-full max-w-xs rounded-md" />
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
            <div>
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
          </div>
          <div className="flex h-48 gap-4">
            <Skeleton className="aspect-video rounded-md" />
            <Skeleton className="aspect-video rounded-md" />
            <Skeleton className="aspect-video rounded-md" />
          </div>
        </div> */}
        {ContentCreations.map((content) => (
          <ContentSection key={content.id} content={content} />
        ))}
      </main>
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
              className={`max-w-4xl bg-gradient-to-tr bg-clip-text text-center text-5xl text-success lg:text-6xl`}
            >
              X
            </Text>
            <Text
              size={20}
              variant={"muted-lg"}
              className="line-clamp-2 font-normal"
            >
              Sharing Animated Content and Tech Tools.
            </Text>
          </div>
          <div className="relative flex flex-col items-center gap-2 md:items-end md:gap-4">
            <div className="rounded bg-gradient-to-r from-gradient-1-from to-gradient-1-to p-0.5">
              <a
                href="https://twitter.com/Ali_Developer05"
                target="_blank"
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  className: "w-full px-4",
                })} rel="noreferrer"
              >
                Checkout My Page
              </a>
            </div>
            <Badge className="absolute right-0 top-0 -translate-y-2 translate-x-2">
              +32k
            </Badge>
          </div>
        </Container>
      </Container>
    </div>
  );
}
