import React from "react";

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { cn } from "@workspace/ui/lib/utils";

import { Video } from "../video";

interface VideosProps {
  values: string[];
}

export const Videos = ({ values }: VideosProps) => {
  return (
    <div className="my-8">
      <Carousel opts={{ containScroll: false }}>
        <CarouselContent className="ml-0 space-x-4">
          {values.map((value, index) => {
            const isPhone = value.includes("-PHONE");
            return (
              <div
                key={index}
                className={cn(
                  "shrink-0 basis-auto rounded-3xl",
                  !isPhone && "outline"
                )}
              >
                <Video
                  src={value}
                  poster={value.replace(/\.mp4(?=[?#]|$)/i, ".jpg")}
                  className="max-h-200 rounded-3xl"
                />
              </div>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
