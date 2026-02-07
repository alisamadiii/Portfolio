import React from "react";

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";

import { Video } from "../video";

interface VideosProps {
  values: { url: string; thumbnail: string | null }[];
}

export const Videos = ({ values }: VideosProps) => {
  return (
    <div className="my-8">
      <Carousel>
        <CarouselContent className="ml-0">
          {values.map((value) => (
            <div key={value.url} className="basis-1/2">
              <Video
                src={value.url}
                poster={value.thumbnail ?? undefined}
                className="rounded-3xl"
              />
            </div>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};
