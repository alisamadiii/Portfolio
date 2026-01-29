import React from "react";

import { RouterOutputs } from "@workspace/trpc/routers/_app";

interface MediaViewProps {
  media: RouterOutputs["admin"]["sources"]["readById"]["media"][number];
}

export const MediaView = ({ media }: MediaViewProps) => {
  return (
    <div className="h-full">
      {media.type === "image" ? (
        <img
          src={media.url}
          alt={media.alt || ""}
          className="h-full w-full object-contain"
        />
      ) : (
        <video src={media.url} className="h-full w-full object-contain" />
      )}
    </div>
  );
};
