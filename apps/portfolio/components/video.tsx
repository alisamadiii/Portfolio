"use client";

import React, { useRef } from "react";
import {
  FullscreenButton,
  isHLSProvider,
  MediaPlayer,
  MediaPlayerInstance,
  MediaProvider,
  PlayButton,
  Poster,
  useMediaState,
  useVideoQualityOptions,
} from "@vidstack/react";

import {
  FullscreenExit,
  MediaPause,
  MediaPlay,
} from "@workspace/ui/icons/general";

import "@vidstack/react/player/styles/base.css";

import Hls from "hls.js";

import { cn } from "@workspace/ui/lib/utils";

interface VideoProps extends React.ComponentProps<"video"> {
  className?: string;
  wrapperClassName?: string;
  poster?: string;
  src: string;
}

export const Video = ({ className, poster, src }: VideoProps) => {
  const handleProviderChange = (provider: unknown) => {
    if (provider && isHLSProvider(provider)) {
      (provider as { library: typeof Hls }).library = Hls;
    }
  };

  const player = useRef<MediaPlayerInstance>(null);
  const isPaused = useMediaState("paused", player);
  const isFullscreen = useMediaState("fullscreen", player);

  return (
    <MediaPlayer
      ref={player}
      src={src}
      playsInline
      onProviderChange={handleProviderChange}
      className={cn(
        "group shadow-card w-full shrink-0 basis-auto overflow-hidden rounded-3xl bg-white outline-none",
        isFullscreen && "rounded-none",
        className
      )}
    >
      <MediaProvider>
        {/* To read playing state, use useMediaState('playing') or useMediaState('paused') in a child of MediaProvider. */}
        <div
          className={cn(
            "shadow-dialog bg-background/20 absolute right-2 bottom-2 left-2 z-1 flex translate-y-full flex-wrap items-center gap-2 rounded-xl px-4 py-2 opacity-0 blur-sm backdrop-blur-sm duration-200",
            !isPaused
              ? "group-hover:translate-y-0 group-hover:opacity-100 group-hover:blur-none"
              : "translate-y-0 opacity-100 blur-none"
          )}
        >
          <PlayButton className="group active:scale-95">
            <MediaPlay className="hidden size-5 group-data-[paused]:block" />
            <MediaPause className="size-5 group-data-[paused]:hidden" />
          </PlayButton>
          <VideoQualitySelect />
          <FullscreenButton className="group ml-auto">
            <FullscreenExit className="size-5" />
          </FullscreenButton>
        </div>
        {poster && (
          <Poster
            className="absolute inset-0 block h-full w-full rounded-md bg-black bg-white object-contain opacity-0 transition-opacity data-[visible]:opacity-100 [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
            src={poster}
          />
        )}
      </MediaProvider>
    </MediaPlayer>
  );
};

function VideoQualitySelect() {
  const options = useVideoQualityOptions({ auto: true, sort: "descending" });

  if (options.disabled || options.length <= 1) return null;

  return (
    <select
      value={options.selectedValue}
      onChange={(e) => {
        const value = e.target.value;
        const option = options.find((o) => o.value === value);
        option?.select();
      }}
      className="ring-ring/50 h-8 w-auto rounded-md py-1 duration-200 outline-none focus:ring-2"
      aria-label="Select Video Quality"
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.selected}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
