import React, { useState } from "react";
import * as Element from "@/components/TwitterContentsElement";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Props = {};

export default function TwitterContent18({}: Props) {
  const [angle, setAngle] = useState(0);

  const codeString = `h1 {
  ${angle >= 1 ? "background: linear-gradient(to right, red, orange);" : ""}
  ${angle >= 2 ? "-webkit-background-clip: text;" : ""}
  ${angle >= 3 ? "-webkit-text-fill-color: transparent;" : ""}
}`;

  return (
    <Element.Wrapper>
      <Element.Code>
        <SyntaxHighlighter language="css">{codeString}</SyntaxHighlighter>
      </Element.Code>
      <Element.Preview>
        <div className="absolute top-8 w-full max-w-sm px-4">
          <Slider
            min={-0.1}
            max={3}
            step={1}
            value={[angle]}
            onValueChange={([angle]) => setAngle(angle)}
          />
          <p className="mt-2 text-xs text-gray-500">
            Use this for understanding how each property works
          </p>
        </div>
        <h1
          className={cn(
            "text-3xl font-black tracking-tight md:text-5xl lg:text-7xl",
            angle >= 1 && "gradient-bg",
            angle >= 2 && "gradient-clip",
            angle >= 3 && "gradient-fill"
          )}
        >
          TEXT GRADIENT
        </h1>
      </Element.Preview>
    </Element.Wrapper>
  );
}
