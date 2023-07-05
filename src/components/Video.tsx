import React from "react";

import { Player, BigPlayButton, ControlBar, LoadingSpinner } from "video-react";

type Props = {
  path: string;
};

export default function Video({ path }: Props) {
  return (
    <Player>
      <source src={path} />
      <LoadingSpinner />
      <BigPlayButton position="center" />
      <ControlBar autoHide={true} />
    </Player>
  );
}
