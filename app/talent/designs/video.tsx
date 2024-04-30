"use client";

import React, { type ChangeEvent, useRef, useState } from "react";

export default function Video() {
  const [file, setFile] = useState<null | File>(null);

  const videoRef = useRef<null | HTMLVideoElement>(null);

  const uploadingFile = (event: ChangeEvent<HTMLInputElement>) => {
    // @ts-expect-error
    const file = event.target.files[0];

    setFile(file);
  };

  return (
    <div>
      {!file ? (
        <label className="cursor-pointer">
          <div className="rounded-md bg-black px-4 py-1 text-white">
            Upload a video
          </div>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={uploadingFile}
          />
        </label>
      ) : (
        <div className="aspect-video max-w-2xl overflow-hidden rounded-xl">
          <video
            ref={videoRef}
            src={URL.createObjectURL(file)}
            autoPlay={true}
            playsInline
            className="h-full w-full object-cover"
          ></video>
        </div>
      )}
    </div>
  );
}
