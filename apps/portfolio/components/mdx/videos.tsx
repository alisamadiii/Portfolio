"use client";

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
    | {
        id: string;
        isPhone?: boolean;
        params?: { time?: string };
      }[];
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
                ? `https://customer-8ljelsuup97yj117.cloudflarestream.com/${value.id}/manifest/video.m3u8`
                : value;

            const poster = getCloudflareStreamThumbnailUrl(
              url,
              typeof value === "object" ? value.params?.time : undefined
            );

            return <Video key={index} src={url} poster={poster ?? undefined} />;
          })}
        </CarouselContent>
      </Carousel>
    </div>
  );
};
