"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";

import { Pricing } from "@/components/pricing";

export default function Home() {
  return (
    <main className="container py-48">
      <h1 className="text-4xl font-bold md:text-6xl">Motion</h1>
      <p className="text-lg text-gray-500">
        Motion is a library for creating beautiful animations and interactions.
      </p>
      <Carousel>
        <CarouselContent className="my-12">
          {Array.from({ length: 10 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="ml-4 aspect-square basis-[400px]"
            ></CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext />
        <CarouselPrevious />
      </Carousel>

      <Pricing />
    </main>
  );
}
