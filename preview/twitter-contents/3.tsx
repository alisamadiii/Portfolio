import React, { useState } from "react";

import * as Element from "@/components/TwitterContentsElement";
import SyntaxHighlighter from "@/components/SyntaxHighlighter";
import { Button } from "@/components/ui/button";
import ColorPicker from "@/components/ColorPicker";
import { cn } from "@/lib/utils";

export default function TwitterContents3() {
  const [selectedDiv, setSelectedDiv] = useState<
    "purple" | "orange" | "blue" | "global"
  >("global");
  const [selecting, setSelecting] = useState(false);

  const [color, setColor] = useState({
    global: {
      backgroundColor: "#ff0000",
      color: "#ffffff",
    },
    purple: {
      backgroundColor: "#ff0000",
      color: "#ffffff",
    },
    orange: {
      backgroundColor: "#ff0000",
      color: "#ffffff",
    },
    blue: {
      backgroundColor: "#ff0000",
      color: "#ffffff",
    },
  });

  const codeString = `${selectedDiv === "global" ? "" : selectedDiv}::selection {
    background-color: ${color[selectedDiv].backgroundColor};
    color: ${color[selectedDiv].color};
} 
`;

  return (
    <Element.Wrapper>
      <Element.Code>
        <SyntaxHighlighter language="css">{codeString}</SyntaxHighlighter>
      </Element.Code>
      <Element.Preview>
        {selecting && (
          <div
            className="absolute inset-0 cursor-pointer rounded-md bg-natural-200 opacity-0 duration-100 hover:opacity-100"
            onClick={() => {
              if (selecting) {
                setSelectedDiv("global");
                setSelecting(false);
              }
            }}
          ></div>
        )}
        <div
          className={cn(
            "group relative w-full rounded-md border border-purple-500 bg-purple-200 p-2 selection:bg-[var(--background-color)] selection:text-[var(--color)]",
            selectedDiv !== "purple" &&
              selectedDiv !== "global" &&
              !selecting &&
              "opacity-50"
          )}
          style={{
            // @ts-ignore
            "--background-color":
              selectedDiv === "global"
                ? color.global.backgroundColor
                : color.purple.backgroundColor,
            // @ts-ignore
            "--color":
              selectedDiv === "global"
                ? color.global.color
                : color.purple.color,
          }}
          onClick={() => {
            if (selecting) {
              setSelectedDiv("purple");
              setSelecting(false);
            }
          }}
        >
          {selecting && (
            <div className="absolute inset-0 cursor-pointer rounded-md bg-natural-200/50 opacity-0 duration-100 group-hover:opacity-100"></div>
          )}
          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p>
        </div>
        <div
          className={cn(
            "group relative w-full rounded-md border border-orange-500 bg-orange-200 p-2 selection:bg-[var(--background-color)] selection:text-[var(--color)]",
            selectedDiv !== "orange" &&
              selectedDiv !== "global" &&
              !selecting &&
              "opacity-50"
          )}
          style={{
            // @ts-ignore
            "--background-color":
              selectedDiv === "global"
                ? color.global.backgroundColor
                : color.orange.backgroundColor,
            // @ts-ignore
            "--color":
              selectedDiv === "global"
                ? color.global.color
                : color.orange.color,
          }}
          onClick={() => {
            if (selecting) {
              setSelectedDiv("orange");
              setSelecting(false);
            }
          }}
        >
          {selecting && (
            <div className="absolute inset-0 cursor-pointer rounded-md bg-natural-200/50 opacity-0 duration-100 group-hover:opacity-100"></div>
          )}
          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p>
        </div>
        <div
          className={cn(
            "group relative w-full rounded-md border border-blue-500 bg-blue-200 p-2 selection:bg-[var(--background-color)] selection:text-[var(--color)]",
            selectedDiv !== "blue" && selectedDiv !== "global" && "opacity-50"
          )}
          style={{
            // @ts-ignore
            "--background-color":
              selectedDiv === "global"
                ? color.global.backgroundColor
                : color.blue.backgroundColor,
            // @ts-ignore
            "--color":
              selectedDiv === "global" ? color.global.color : color.blue.color,
          }}
          onClick={() => {
            if (selecting) {
              setSelectedDiv("blue");
              setSelecting(false);
            }
          }}
        >
          {selecting && (
            <div className="absolute inset-0 cursor-pointer rounded-md bg-natural-200/50 opacity-0 duration-100 group-hover:opacity-100"></div>
          )}
          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit.</p>
        </div>
      </Element.Preview>
      <Element.Settings className="flex flex-col gap-2">
        <Button
          onClick={() => setSelecting(!selecting)}
          variant={selecting ? "secondary" : "default"}
          className="w-fit duration-0"
        >
          {selecting ? "Cancel" : "Select a div"}
        </Button>
        {selectedDiv && (
          <>
            <ColorPicker
              label={`background`}
              value={color[selectedDiv].backgroundColor}
              onValueChange={(value) => {
                setColor({
                  ...color,
                  [selectedDiv]: {
                    ...color[selectedDiv],
                    backgroundColor: value,
                  },
                });
              }}
            />
            <ColorPicker
              label={`color`}
              value={color[selectedDiv].color}
              onValueChange={(value) => {
                setColor({
                  ...color,
                  [selectedDiv]: {
                    ...color[selectedDiv],
                    color: value,
                  },
                });
              }}
            />
          </>
        )}
      </Element.Settings>
    </Element.Wrapper>
  );
}
