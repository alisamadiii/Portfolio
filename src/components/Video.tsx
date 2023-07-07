import React from "react";

import { Player, BigPlayButton, ControlBar, LoadingSpinner } from "video-react";

type Props = {
  path: string;
  poster?: string;
};

export default function Video({ path, poster }: Props) {
  return (
    <Player poster={poster}>
      <source src={path} />
      <LoadingSpinner />
      <BigPlayButton position="center" />
      <ControlBar autoHide={true} />
    </Player>
  );
}
