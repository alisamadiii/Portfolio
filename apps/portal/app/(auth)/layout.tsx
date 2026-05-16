"use client";

import { useState } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [videoEnded, setVideoEnded] = useState(false);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <div className="relative hidden lg:block">
        <video
          src="https://cdn.alisamadii.com/media/welcome-video.mp4"
          autoPlay
          muted
          playsInline
          onEnded={() => setVideoEnded(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src="https://cdn.alisamadii.com/media/3d-me.webp"
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${videoEnded ? "opacity-100" : "opacity-0"}`}
        />
      </div>
    </div>
  );
}
