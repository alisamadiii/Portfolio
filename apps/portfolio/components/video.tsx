"use client";

import React, { useEffect, useRef, useState } from "react";

import { CirclePlay } from "@workspace/ui/icons/general";
import { cn } from "@workspace/ui/lib/utils";

interface VideoProps extends React.ComponentProps<"video"> {
  className?: string;
}

export const Video = ({ className, ...props }: VideoProps) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isPlaying) {
      videoRef.current?.play();
    } else {
      videoRef.current?.pause();
    }
  }, [isPlaying]);

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className={cn("rounded-3xl", className)}
        onClick={() => setIsPlaying(!isPlaying)}
        {...props}
      />
      <CirclePlay
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 size-20 -translate-x-1/2 -translate-y-1/2 duration-200",
          isPlaying ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
      />
    </div>
  );
};
