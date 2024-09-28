import React, { useState } from "react";

import * as Element from "@/components/TwitterContentsElement";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ColorPicker from "@/components/ColorPicker";

export default function TwitterContents2() {
  const [border, setBorder] = useState({
    width: 4,
    color: "#ff0000",
    type: "solid",
  });

  const codeString = `div {
  border: ${border.width}px ${border.type} ${border.color};
}`;

  return (
    <Element.Wrapper>
      <Element.Code>
        <SyntaxHighlighter language="css">{codeString}</SyntaxHighlighter>
      </Element.Code>
      <Element.Preview className="flex-row">
        <div
          className="h-24 w-24"
          style={{
            border: `${border.width}px ${border.type} ${border.color}`,
          }}
        />
        <div
          className="h-24 w-24 rounded-full"
          style={{
            border: `${border.width}px ${border.type} ${border.color}`,
          }}
        />
      </Element.Preview>
      <Element.Settings className="space-y-4">
        <div>
          <label className="mb-2 inline-block">Width</label>
          <Slider
            min={1}
            max={10}
            step={0.1}
            value={[border.width]}
            onValueChange={(value) => setBorder({ ...border, width: value[0] })}
            className="max-w-sm"
          />
        </div>
        <Select
          defaultValue="solid"
          onValueChange={(value) => setBorder({ ...border, type: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Style" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
            <SelectItem value="double">Double</SelectItem>
            <SelectItem value="groove">Groove</SelectItem>
            <SelectItem value="ridge">Ridge</SelectItem>
            <SelectItem value="inset">Inset</SelectItem>
            <SelectItem value="outset">Outset</SelectItem>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="hidden">Hidden</SelectItem>
          </SelectContent>
        </Select>
        <ColorPicker
          value={border.color}
          onValueChange={(value) => setBorder({ ...border, color: value })}
        />
      </Element.Settings>
    </Element.Wrapper>
  );
}
