import { AnimatePresence, motion } from "framer-motion";
import React, { useRef, useState } from "react";

// Icons
import { FaPlay, FaPause } from "react-icons/fa";

interface Props {
  videoUrl: string;
  aspectRatio?: string;
}

export default function Video({ videoUrl, aspectRatio }: Props) {
  const [isPlay, setIsPlay] = useState(false);

  const video = useRef<null | HTMLVideoElement>(null);

  const onPlayVideo = () => {
    if (!video.current) return;

    isPlay ? video.current.pause() : video.current.play();
  };

  return (
    <div
      className={`group relative w-full rounded-xl border-video bg-accents-1 duration-200 ${
        isPlay ? "border-success" : "border-accents-1"
      }`}
      style={{ aspectRatio: aspectRatio ?? "16/9" }}
    >
      <video
        ref={video}
        playsInline
        src={videoUrl}
        className="h-full w-full rounded-lg object-cover"
      />

      <button
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-400/20 p-4 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
        onClick={() => {
          onPlayVideo();
          setIsPlay(!isPlay);
        }}
      >
        <AnimatePresence initial={false} mode="wait">
          {isPlay ? (
            <motion.div
              key={"pause"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.1 }}
            >
              <FaPause />
            </motion.div>
          ) : (
            <motion.div
              key={"play"}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.1 }}
            >
              <FaPlay />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </div>
  );
}
