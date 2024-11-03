import React, { useEffect, useState } from "react";

import * as Element from "@/components/TwitterContentsElement";
import { Button } from "@/components/ui/button";

export default function TwitterContents11() {
  const [timer, setTimer] = useState(0);

  const [running, setRunning] = useState(false);

  const handleStart = () => {
    setRunning(true);
  };

  useEffect(() => {
    let startTime: number;
    let animationFrameId: number;

    if (running) {
      startTime = Date.now() - timer;

      const updateTimer = () => {
        setTimer(Date.now() - startTime);
        animationFrameId = requestAnimationFrame(updateTimer);
      };

      animationFrameId = requestAnimationFrame(updateTimer);

      return () => {
        cancelAnimationFrame(animationFrameId);
      };
    }
  }, [running, timer]);

  return (
    <Element.Wrapper>
      <Element.Preview>
        <h1 className="font-mono text-7xl font-bold">
          {`${Math.floor(timer / 60000)
            .toString()
            .padStart(
              2,
              "0"
            )}:${((timer % 60000) / 1000).toFixed(3).padStart(6, "0")}`}
        </h1>
        <div className="flex gap-2">
          <Button onClick={handleStart} disabled={running}>
            Start
          </Button>
          <Button
            onClick={() => setRunning(!running)}
            variant="outline"
            disabled={!running}
          >
            Pause
          </Button>
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}
