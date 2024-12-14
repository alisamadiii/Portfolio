import React, { useState } from "react";

import * as Element from "@/components/TwitterContentsElement";
import { Bike } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export default function TwitterContent22() {
  const [size, setSize] = useState(16);

  return (
    <Element.Wrapper>
      <Element.Preview>
        <div className="relative flex min-h-96 w-full max-w-sm flex-col items-center justify-center">
          <div
            className="flex items-center gap-2 rounded-md bg-natural-200 px-4 py-1"
            style={{ fontSize: `${size}px` }}
          >
            <div className="h-[1.3cap] w-[1.3cap]">
              <Bike className="h-full w-full" />
            </div>
            <p>Bike</p>
          </div>
          <div className="absolute bottom-6 left-4 right-4 w-full">
            <label
              htmlFor="size"
              className="mb-1 px-2 text-sm text-natural-600"
            >
              Size
            </label>
            <Slider
              id="size"
              min={14}
              max={100}
              step={0.01}
              value={[size]}
              onValueChange={([value]) => {
                if (value < 16) return;
                setSize(value);
              }}
            />
          </div>
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}
