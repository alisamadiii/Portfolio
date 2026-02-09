"use client";

import React, { useEffect, useRef, useState } from "react";

import { MediaPlay } from "@workspace/ui/icons/general";
import { cn } from "@workspace/ui/lib/utils";

interface VideoProps extends React.ComponentProps<"video"> {
  className?: string;
  wrapperClassName?: string;
}

export const Video = ({
  className,
  wrapperClassName,
  ...props
}: VideoProps) => {
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
    <div className={cn("relative", wrapperClassName)}>
      <video
        ref={videoRef}
        className={cn("rounded-3xl", className)}
        onClick={() => setIsPlaying(!isPlaying)}
        playsInline
        {...props}
      />
      <div
        className={cn(
          "bg-background/50 pointer-events-none absolute bottom-4 left-4 flex size-10 items-center justify-center rounded-full border backdrop-blur-sm duration-200 dark:border-none",
          isPlaying ? "scale-0 opacity-0" : "scale-100 opacity-100"
        )}
      >
        <MediaPlay className="size-6" />
      </div>
    </div>
  );
};
