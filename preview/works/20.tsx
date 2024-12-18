import React, { useEffect, useState } from "react";
import Image from "next/image";
import { EllipsisVertical } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  MotionConfig,
} from "framer-motion";

import IphoneSimulator from "@/components/IphoneSimulator";

interface PlaylistItem {
  id: string;
  avatar: string;
  title: string;
  artist: string;
  color: string;
}

const playlist: PlaylistItem[] = [
  {
    id: "1",
    avatar:
      "https://images.unsplash.com/photo-1489980557514-251d61e3eeb6?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8N3x8bWFufGVufDB8fDB8fHww",
    title: "Song 1",
    artist: "Artist 1",
    color: "#fff",
  },
  {
    id: "2",
    avatar:
      "https://images.unsplash.com/photo-1583341612074-ccea5cd64f6a?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjZ8fG1hbnxlbnwwfHwwfHx8MA%3D%3D",
    title: "Song 2",
    artist: "Artist 2",
    color: "#006400",
  },
  {
    id: "3",
    avatar:
      "https://images.unsplash.com/photo-1463860452799-793003efcb2d?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MzJ8fG1hbnxlbnwwfHwwfHx8MA%3D%3D",
    title: "Song 3",
    artist: "Artist 3",
    color: "#000",
  },
  {
    id: "4",
    avatar:
      "https://plus.unsplash.com/premium_photo-1707932495000-5748b915e4f2?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NDF8fG1hbnxlbnwwfHwwfHx8MA%3D%3D",
    title: "Song 1",
    artist: "Artist 1",
    color: "#ff0000",
  },
];

export default function Work20() {
  const [selectedMusic, setSelectedMusic] = useState<PlaylistItem | null>(null);
  const [expandedMusic, setExpandedMusic] = useState(false);
  const [isLayoutGroup, setIsLayoutGroup] = useState(false);

  useEffect(() => {
    if (expandedMusic) {
      setTimeout(() => {
        setIsLayoutGroup(true);
      }, 800);
    } else {
      setIsLayoutGroup(false);
    }
  }, [expandedMusic]);

  const Element = isLayoutGroup ? LayoutGroup : "div";

  return (
    <MotionConfig
      transition={{
        duration: expandedMusic ? 0.8 : 0.5,
        type: "spring",
        bounce: 0,
      }}
    >
      <IphoneSimulator className="bg-neutral-800 text-white [&_[data-top]]:bg-transparent">
        <AnimatePresence mode="popLayout" initial={false}>
          {!expandedMusic && (
            <motion.div
              initial={{ y: -100 }}
              animate={{ y: 0 }}
              exit={{ y: -100 }}
              className="px-4"
            >
              <h1 className="text-2xl font-bold">Your playlist</h1>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={{
            background: selectedMusic ? selectedMusic.color : "rgb(38, 38, 38)",
          }}
          className="pointer-events-none absolute inset-0 -z-10"
        />

        {!expandedMusic && (
          <div className="mt-4 flex flex-col gap-4 px-4">
            {playlist.map((item) => (
              <button
                key={item.id}
                className="flex items-center gap-4"
                onClick={() => {
                  setSelectedMusic(item);
                  setExpandedMusic(true);
                }}
              >
                <motion.div
                  layoutId={item.id}
                  className="relative h-14 w-14 overflow-hidden rounded-lg"
                  style={{ borderRadius: 12 }}
                >
                  <Image
                    src={item.avatar}
                    alt={item.title}
                    fill
                    objectFit="cover"
                  />
                </motion.div>
                <div className="flex flex-col">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-start text-xs opacity-50">{item.artist}</p>
                </div>
                <EllipsisVertical className="ml-auto opacity-50" />
              </button>
            ))}
          </div>
        )}

        <Element id="testing">
          {expandedMusic && selectedMusic && (
            <div className="absolute inset-0 flex flex-col justify-center gap-4 overflow-hidden p-4 py-12">
              <div className="relative flex aspect-square w-full shrink-0">
                <div className="absolute bottom-0 left-0 flex w-full flex-col gap-4">
                  {playlist
                    .filter((_, index) => index + 1 < Number(selectedMusic.id))
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        layoutId={item.id}
                        className="relative aspect-square w-full shrink-0 overflow-hidden"
                        style={{ borderRadius: 12 }}
                        onClick={() => {
                          setSelectedMusic(item);
                        }}
                      >
                        <Image
                          src={item.avatar}
                          alt={item.title}
                          fill
                          objectFit="cover"
                        />
                      </motion.div>
                    ))}
                </div>
              </div>
              <motion.div
                key={selectedMusic.id}
                layoutId={selectedMusic.id}
                className="relative aspect-square w-full shrink-0 overflow-hidden"
                style={{ borderRadius: 12 }}
              >
                <Image
                  src={selectedMusic.avatar}
                  alt={selectedMusic.title}
                  fill
                  objectFit="cover"
                  className="pointer-events-none select-none"
                />
              </motion.div>
              <div className="relative flex aspect-square w-full shrink-0">
                <div className="absolute left-0 top-0 flex aspect-square w-full shrink-0 flex-col gap-4">
                  {playlist
                    .filter(
                      (item, index) => index + 1 > Number(selectedMusic.id)
                    )
                    .map((item) => (
                      <motion.div
                        key={item.id}
                        layoutId={item.id}
                        className="relative aspect-square w-full shrink-0 overflow-hidden"
                        style={{ borderRadius: 12 }}
                        onClick={() => {
                          setSelectedMusic(item);
                        }}
                      >
                        <Image
                          src={item.avatar}
                          alt={item.title}
                          fill
                          objectFit="cover"
                        />
                      </motion.div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </Element>

        <AnimatePresence>
          {expandedMusic && (
            <motion.div
              initial={{ y: "125%" }}
              animate={{ y: 0 }}
              exit={{ y: "125%" }}
              className="absolute bottom-0 left-0 right-0 z-20 p-2 pb-8 pt-0"
              onClick={async () => {
                setIsLayoutGroup(false);
                await new Promise((resolve) => setTimeout(resolve, 100));
                setSelectedMusic(null);
                setExpandedMusic(false);
              }}
            >
              <motion.div className="flex h-[150px] items-center justify-center rounded-3xl bg-neutral-900">
                <p>Contents</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </IphoneSimulator>
    </MotionConfig>
  );
}
