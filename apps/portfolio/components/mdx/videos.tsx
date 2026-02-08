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
                  "max-w-full shrink-0 basis-auto overflow-hidden rounded-3xl",
                  !isPhone && "outline"
                )}
              >
                <Video
                  src={value}
                  poster={value.replace(/\.mp4(?=[?#]|$)/i, ".jpg")}
                  className="h-full max-h-100 w-full object-contain md:max-h-200"
                  wrapperClassName="h-full bg-muted"
                  loop
                />
              </div>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
