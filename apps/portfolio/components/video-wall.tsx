"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";

import type { ClientVideo } from "@/lib/clients";

// One shared observer for every tile on the page — 100 videos, 1 observer.
type InViewCallback = (inView: boolean) => void;

const callbacks = new WeakMap<Element, InViewCallback>();
let observer: IntersectionObserver | null = null;

function observe(element: Element, callback: InViewCallback) {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          callbacks.get(entry.target)?.(entry.isIntersecting);
        }
      },
      { rootMargin: "25% 0px" }
    );
  }
  callbacks.set(element, callback);
  observer.observe(element);
  return () => {
    callbacks.delete(element);
    observer?.unobserve(element);
  };
}

type VideoRow = { phone: boolean; items: ClientVideo[] };

export const VideoWall = ({ videos }: { videos: ClientVideo[] }) => {
  const rows: VideoRow[] = [];
  for (const video of videos) {
    const last = rows[rows.length - 1];
    if (last && last.phone === !!video.isPhone) {
      last.items.push(video);
    } else {
      rows.push({ phone: !!video.isPhone, items: [video] });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, rowIndex) =>
        row.phone ? (
          <div key={rowIndex} className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {row.items.map((video, index) => (
              <VideoTile key={index} video={video} />
            ))}
          </div>
        ) : (
          row.items.map((video, index) => (
            <VideoTile key={`${rowIndex}-${index}`} video={video} />
          ))
        )
      )}
    </div>
  );
};

const VideoTile = ({ video }: { video: ClientVideo }) => {
  const ref = React.useRef<HTMLVideoElement>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || !video.src) return;

    return observe(element, (inView) => {
      if (inView) {
        if (!element.getAttribute("src")) {
          element.src = video.src;
          element.load();
        }
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          element.play().catch(() => {});
        }
      } else {
        // Unload so offscreen videos release network, memory, and decoder slots
        element.pause();
        element.removeAttribute("src");
        element.load();
        setReady(false);
      }
    });
  }, [video.src]);

  return (
    <div
      className={cn(
        "bg-muted relative overflow-hidden rounded-2xl border [content-visibility:auto]",
        video.isPhone ? "aspect-[9/16]" : "aspect-video"
      )}
    >
      {video.src && (
        <video
          ref={ref}
          muted
          loop
          playsInline
          disableRemotePlayback
          preload="none"
          poster={video.poster}
          onLoadedData={() => setReady(true)}
          className={cn(
            "size-full object-cover blur-sm transition-[opacity,filter] duration-700 ease-out",
            ready || video.poster ? "opacity-100 blur-none" : "opacity-0"
          )}
        />
      )}
    </div>
  );
};
