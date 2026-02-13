"use client";

import React, { useEffect, useRef, useState } from "react";

import { Button } from "@workspace/ui/components/button";
import { Fullscreen, MediaPlay } from "@workspace/ui/icons/general";
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
  const [isFullscreen, setIsFullscreen] = useState(false);
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
    <div className={cn("group relative", wrapperClassName)}>
      <video
        ref={videoRef}
        className={cn("rounded-3xl", isFullscreen && "bg-white", className)}
        onClick={() => setIsPlaying(!isPlaying)}
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

      <div className="absolute right-4 bottom-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <Button
          onClick={() => {
            videoRef.current?.requestFullscreen();
            setIsFullscreen(true);
          }}
          variant="outline"
          size="icon"
        >
          <Fullscreen className="size-6" />
        </Button>
      </div>
    </div>
  );
};
