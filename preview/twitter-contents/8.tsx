import React, { useState } from "react";

import * as Element from "@/components/TwitterContentsElement";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

type Props = {};

export default function TwitterContents8({}: Props) {
  const [values, setValues] = useState({
    padding: 12,
    borderOut: 12,
    borderIn: 4,
  });

  const codeString = `.border-out {
  border-radius: ${values.borderIn + values.padding}px; 
  /* border-in + padding = ${values.borderIn} + ${values.padding} */
}`;

  return (
    <Element.Wrapper>
      <Element.Code>
        <SyntaxHighlighter language="css">{codeString}</SyntaxHighlighter>
      </Element.Code>
      <Element.Preview className="max-h-96 justify-start">
        <div
          className="aspect-square w-full translate-x-[45%] translate-y-20 bg-natural-300"
          style={{
            padding: values.padding,
            borderRadius: values.borderIn + values.padding,
          }}
        >
          <div
            className="absolute left-0 top-[25%] flex flex-col items-center overflow-hidden"
            style={{ width: values.padding }}
          >
            <div className="h-px w-full bg-red-500"></div>
            <p className="mt-px text-xs text-red-500">{values.padding}px</p>
          </div>
          <div
            className="h-full w-full bg-natural-200"
            style={{ borderRadius: values.borderIn }}
          ></div>
        </div>
      </Element.Preview>
      <Element.Settings className="space-y-4">
        <Label>
          <span className="mb-2 inline-block">Padding</span>
          <Slider
            value={[values.padding]}
            onValueChange={(value) =>
              setValues({ ...values, padding: value[0] })
            }
          />
        </Label>
        <Label>
          <span className="mb-2 inline-block">Border In</span>
          <Slider
            value={[values.borderIn]}
            onValueChange={(value) =>
              setValues({ ...values, borderIn: value[0] })
            }
          />
        </Label>
      </Element.Settings>
    </Element.Wrapper>
  );
}
