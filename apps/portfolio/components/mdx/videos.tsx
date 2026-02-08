import React from "react";

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";

import { Video } from "../video";

interface VideosProps {
  values: string[];
}

export const Videos = ({ values }: VideosProps) => {
  return (
    <div className="my-8">
      <Carousel>
        <CarouselContent className="ml-0">
          {values.map((value, index) => (
            <div key={index} className="shrink-0 basis-auto">
              <Video
                src={value}
                poster={value.replace(/\.mp4(?=[?#]|$)/i, "-thumb.jpg")}
                className="max-h-200 rounded-3xl"
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
