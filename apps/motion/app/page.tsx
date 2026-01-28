"use client";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { IosSettings } from "@workspace/ui/motion/animation-svgs";

import { Pricing } from "@/components/pricing";

export default function Home() {
  return (
    <main className="container py-48">
      {/* Header with text */}
      <div className="relative">
        <h1 className="text-4xl font-bold md:text-6xl">Motion</h1>
        <p className="text-muted-foreground text-lg">
          Motion is a library for creating beautiful animations and
          interactions.
        </p>
      </div>
      <Carousel>
        <CarouselContent className="my-12">
          {Array.from({ length: 10 }).map((_, index) => (
            <CarouselItem
              key={index}
              className="group ml-4 aspect-square basis-[400px] overflow-hidden p-0 duration-200 active:scale-95"
              style={{
                perspective: "1000px",
              }}
            >
              <div className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-x-24">
                <IosSettings />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselNext />
        <CarouselPrevious />
      </Carousel>

      <Pricing />
    </main>
  );
}
