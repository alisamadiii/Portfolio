import React from "react";

import * as Element from "@/components/TwitterContentsElement";
import { Input } from "@/components/ui/input";

const colors = [
  "#1a1a1a",
  "#f5f5f5",
  "#3b82f6",
  "#10b981",
  "#ef4444",
  "#f59e0b",
];

export default function TwitterContent24() {
  return (
    <Element.Wrapper>
      <Element.Preview>
        <div className="flex w-full flex-col items-center gap-2">
          {colors.map((color) => (
            <label className="flex w-full items-center justify-center gap-2">
              <div
                key={color}
                className="size-10 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <Input
                className="max-w-sm"
                style={{ caretColor: color, borderColor: color }}
              />
            </label>
          ))}
        </div>
      </Element.Preview>
    </Element.Wrapper>
  );
}
