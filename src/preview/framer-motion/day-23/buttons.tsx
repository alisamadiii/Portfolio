import React, { useEffect, useRef, useState } from "react";

import { cn } from "@/utils";
import { type panelsType } from ".";
import { directionStore } from "./context";

interface Props {
  selectedPanel: panelsType;
  setSelectedPanel: (a: panelsType) => void;
}

const buttons: panelsType[] = [
  "posts",
  "replies",
  "highlights",
  "articles",
  "media",
];

export default function Buttons({ selectedPanel, setSelectedPanel }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { setDirection } = directionStore();

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const underlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeButton = buttonRefs.current[selectedIndex];
    const underline = underlineRef.current;

    if (underline && activeButton) {
      const wrapperBoundingBox =
        underline.parentElement?.getBoundingClientRect() || { left: 0 };
      const tabBoundingBox = activeButton.getBoundingClientRect();

      underline.style.width = `${tabBoundingBox.width}px`;
      underline.style.left = `${tabBoundingBox.left - wrapperBoundingBox.left}px`;
    }
  }, [selectedIndex]);

  return (
    <div className="no-scrollbar relative mt-4 flex gap-4 overflow-auto px-4 py-2">
      {buttons.map((button, index) => (
        <button
          key={button}
          ref={(el) => {
            buttonRefs.current[index] = el;
          }}
          className={cn(
            "text-sm capitalize outline-none",
            selectedPanel === button ? "text-black" : "text-[#A5A5A5]"
          )}
          style={{ flex: "0 0 auto" }}
          onClick={() => {
            setSelectedPanel(button);
            setSelectedIndex((prevIndex) => {
              const newDirection = prevIndex < index ? 1 : -1;
              setDirection(newDirection);
              return index;
            });
          }}
        >
          {button}
        </button>
      ))}

      <div
        ref={underlineRef}
        className="absolute bottom-0 h-px bg-black"
        style={{ transition: "width 200ms, left 200ms" }}
      ></div>
    </div>
  );
}
