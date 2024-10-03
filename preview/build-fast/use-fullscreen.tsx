import React from "react";
import { useFullscreen } from "@mantine/hooks";

import { Button } from "@/components/ui/button";

export default function UseFullscreen() {
  const { toggle, fullscreen } = useFullscreen();

  return (
    <Button className={`${fullscreen && "bg-red-600"}`} onClick={toggle}>
      {fullscreen ? "Exit" : "Enter"} Fullscreen
    </Button>
  );
}
