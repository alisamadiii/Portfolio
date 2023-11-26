"use client";

import { formatTime } from "@/utils";
import React, { useEffect, useRef, useState } from "react";

import { FaPause, FaPlay } from "react-icons/fa6";
import { MdVolumeUp, MdVolumeOff } from "react-icons/md";
import { FaExpand } from "react-icons/fa";
import { BarLoader } from "react-spinners";

interface Props {
  url: string;
}

export default function Video({ url }: Props) {
  const [isPlay, setIsPlay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const videoRef = useRef<null | HTMLVideoElement>(null);

  const onPlayHandler = () => {
    const video = videoRef.current;

    if (video) {
      if (isPlay) {
        setIsPlay(false);
        video.pause();
      } else {
        setIsPlay(true);
        video.play();
      }
    }
  };

  const onMuteHandler = () => {
    const video = videoRef.current;

    if (video) {
      if (isMuted) {
        setIsMuted(false);
        video.muted = false;
      } else {
        setIsMuted(true);
        video.muted = true;
      }
    }
  };

  const onFullScreenHandler = () => {
    const video = videoRef.current;
    if (video) {
      video.requestFullscreen();
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    if (video) {
      video.addEventListener("loadedmetadata", () => {
        setDuration(video.duration);
      });
    }
  }, [setDuration]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;

    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const progressPercentage = () => {
    const video = videoRef.current;

    if (video) {
      return (currentTime / video.duration) * 100 || 0;
    }
  };

  const handleTimelineClick = (e: any) => {
    const video = videoRef.current;

    if (video) {
      const timeline = e.currentTarget;
      const clickPosition = e.clientX - timeline.getBoundingClientRect().left;
      const timelineWidth = timeline.clientWidth;
      const videoDuration = video.duration;

      const timePosition = (clickPosition / timelineWidth) * videoDuration;
      video.currentTime = timePosition;
    }
  };

  // Autoplay for small screens
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: "0px",
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      });
    }, options);

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isVisible && videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("Autoplay failed:", error);
      });
      setIsPlay(true);
    } else if (!isVisible && videoRef.current) {
      videoRef.current.pause();
      setIsPlay(false);
    }
  }, [isVisible]);

  const handleWaiting = () => {
    setLoading(true);
  };

  const handleCanPlay = () => {
    setLoading(false);
  };

  return (
    <div className="relative flex aspect-video h-full w-full items-center justify-center overflow-hidden rounded-md bg-black">
      {/* Shadow background */}
      <div className="absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-black/50 to-transparent" />
      <video
        ref={videoRef}
        src={url}
        className={`aspect-video ${loading && "opacity-50"} duration-100`}
        playsInline={true}
        controls={false}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
      ></video>
      {/* Loading when the video stopped working due to slow connection */}
      {loading && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <BarLoader color="white" />
        </div>
      )}
      <aside className="absolute bottom-0 left-0 flex w-full flex-col gap-[0.35rem] px-4 py-4 md:gap-4 md:px-4">
        {/* Video Timeline */}
        <div
          className="h-[0.35rem] cursor-pointer overflow-hidden rounded-full bg-[#A7A7A7]/50 duration-150 hover:h-[.5rem]"
          onClick={handleTimelineClick}
        >
          <div
            style={{
              width: `${progressPercentage()}%`,
            }}
            className="h-full bg-white"
          />
        </div>
        {/* Video Duration for small Screens */}
        <div className="flex justify-between text-[0.76rem] tracking-[0.02rem] text-[#8D8D92] md:hidden">
          <small>{formatTime(currentTime)}</small>
          <small>- {formatTime(duration - currentTime)}</small>
        </div>
        {/* Clickable buttons */}
        <div className="hidden justify-between px-2 text-white md:flex">
          {/* Left Content */}
          <div className="flex items-center gap-[18px]">
            <button onClick={onPlayHandler}>
              {isPlay ? <FaPause className="" /> : <FaPlay className="" />}
            </button>
            <button onClick={onMuteHandler}>
              {isMuted ? <MdVolumeOff /> : <MdVolumeUp />}
            </button>
            {/* Video Duration */}
            <small className="text-[0.76rem] tracking-[0.02rem] text-[#8D8D92]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </small>
          </div>
          {/* Right Content */}
          <button onClick={onFullScreenHandler}>
            <FaExpand />
          </button>
        </div>
      </aside>
    </div>
  );
}
