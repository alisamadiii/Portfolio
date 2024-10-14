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
  const [values, setValues] = useState({
    primary: "#00ADB5",
    secondary: "#393E46",
    borderRadius: 4,
  });

  const codeString = `:root {
  --clr-primary: ${values.primary};
  --clr-secondary: ${values.secondary};
  --border-radius: ${values.borderRadius}px;
}`;

  return (
    <Element.Wrapper>
      <Element.Code>
        <SyntaxHighlighter language="css">{codeString}</SyntaxHighlighter>
      </Element.Code>
      <Element.Preview className="max-h-96 justify-start overflow-auto">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: values.primary }}>
            Global Variables
          </h1>
          <p style={{ color: values.secondary }}>
            Using Global Variables is the best method to make your styling to
            next level.
          </p>
          <button
            className="mt-4 h-8 px-4 hover:opacity-90"
            style={{
              backgroundColor: values.primary,
              borderRadius: `${values.borderRadius}px`,
            }}
          >
            Learn more
          </button>
        </div>

        <div className="mt-12">
          <h2
            className="text-center text-2xl font-bold"
            style={{ color: values.primary }}
          >
            More examples
          </h2>
          <p className="text-center" style={{ color: values.secondary }}>
            Using Global Variables is the best method to make your styling to
            next level.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 w-full"
                style={{
                  borderRadius: `${values.borderRadius}px`,
                  border: `1px solid ${values.primary}`,
                  backgroundColor: `${values.primary}10`,
                }}
              ></div>
            ))}
          </div>
        </div>
      </Element.Preview>
      <Element.Settings className="space-y-4">
        <ColorPicker
          value={values.primary}
          onValueChange={(value) => setValues({ ...values, primary: value })}
        />
        <ColorPicker
          value={values.secondary}
          onValueChange={(value) => setValues({ ...values, secondary: value })}
        />
        <Slider
          value={[values.borderRadius]}
          onValueChange={(value) =>
            setValues({ ...values, borderRadius: value[0] })
          }
        />
      </Element.Settings>
    </Element.Wrapper>
  );
}
