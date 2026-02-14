import React from "react";

import {
  Carousel,
  CarouselContent,
  CarouselNext,
  CarouselPrevious,
} from "@workspace/ui/components/carousel";
import { cn } from "@workspace/ui/lib/utils";

import { getCloudflareStreamThumbnailUrl } from "@/lib/cloudflare-stream";

import { Video } from "../video";

interface VideosProps {
  values:
    | string[]
    | { id: string; isPhone?: boolean; params?: { time?: string } }[];
}

export const Videos = ({ values }: VideosProps) => {
  return (
    <div className="my-8">
      <Carousel opts={{ containScroll: false }}>
        <CarouselContent className="ml-0 space-x-4">
          {values.map((value, index) => {
            const isPhone =
              typeof value === "object"
                ? value.isPhone
                : value.includes("-PHONE");

            const url =
              typeof value === "object"
                ? `https://customer-8ljelsuup97yj117.cloudflarestream.com/${value.id}/downloads/default.mp4${value.params?.time ? `?time=${value.params.time}` : ""}`
                : value;

            const poster = getCloudflareStreamThumbnailUrl(url);

            return (
              <div
                key={index}
                className={cn(
                  "max-w-full shrink-0 basis-auto overflow-hidden rounded-3xl",
                  !isPhone && "outline"
                )}
              >
                <Video
                  src={url}
                  poster={poster ?? undefined}
                  className="h-full max-h-100 w-full object-contain md:max-h-200"
                  wrapperClassName="h-full bg-muted"
                />
              </div>
            );
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
