import React from "react";

import { Player, BigPlayButton, ControlBar, LoadingSpinner } from "video-react";

type Props = {
  path: string;
};

export default function Video({ path }: Props) {
  return (
    <Player poster="https://images.unsplash.com/photo-1504639725590-34d0984388bd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1074&q=80">
      <source src={path} />
      <LoadingSpinner />
      <BigPlayButton position="center" />
      <ControlBar autoHide={true} />
    </Player>
  );
}
