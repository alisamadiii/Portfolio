import React, { useState } from "react";

import { toast } from "sonner";

import * as Element from "@/components/TwitterContentsElement";
import { Button } from "@/components/ui/button";

export default function TwitterContents10() {
  const [isPaused, setIsPaused] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [key, setKey] = useState(0);

  return (
    <Element.Wrapper>
      <Element.Preview>
        <div className="h-4 w-full max-w-xl overflow-hidden rounded-xl bg-natural-300">
          <div
            key={key}
            className="h-full w-full animate-progress rounded-l-xl bg-natural-700"
            style={{ animationPlayState: isPaused ? "paused" : "running" }}
            onAnimationEnd={() => setIsEnded(true)}
          ></div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (isEnded) {
                toast("Animation is ended.");
              } else {
                setIsPaused(!isPaused);
              }
            }}
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setKey((prevKey) => prevKey + 1);
              setIsPaused(false);
              setIsEnded(false);
            }}
          >
            Restart
          </Button>
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}
