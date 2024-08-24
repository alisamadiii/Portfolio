"use client";

import React, { type ChangeEvent, useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa6";
import EachList from "./each-list";
import Wrapper from "@/components/designs/wrapper";

export interface ValuesTypes {
  id: number;
  name: string;
  icon: string;
}

const images = [
  "https://cdn.jim-nielsen.com/macos/256/finder-2021-09-10.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/siri-2021-09-10.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/keynote-2021-11-15.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/source-files-git-storage-2023-11-21.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/simulator-2022-11-09.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/raycast-2023-02-14.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/taska-for-github-gitlab-issues-2024-04-24.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/folder-colorizer-pro-2023-11-02.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/telegram-2021-07-12.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/preview-2021-05-28.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/github-desktop-2021-05-20.png?rf=1024",
  "https://cdn.jim-nielsen.com/macos/256/figma-2021-05-05.png?rf=1024",
];

function generateMeaningfulDummyText(): string {
  const words = [
    "quick",
    "brown",
    "fox",
    "jumps",
    "over",
    "lazy",
    "dog",
    "bright",
    "sun",
    "shines",
    "on",
    "clear",
    "day",
    "happy",
    "children",
    "play",
    "in",
    "green",
    "field",
    "gentle",
    "breeze",
    "rustles",
    "through",
    "tall",
    "trees",
    "colorful",
    "flowers",
    "bloom",
    "during",
    "spring",
    "season",
    "birds",
    "sing",
    "beautiful",
    "songs",
    "under",
    "blue",
    "sky",
  ];

  const getRandomWord = () => words[Math.floor(Math.random() * words.length)];

  return `${getRandomWord()}`;
}

export default function Day19() {
  const [formFocus, setFormFocus] = useState(false);

  const [values, setValues] = useState<ValuesTypes[]>([
    {
      id: 1,
      name: generateMeaningfulDummyText(),
      icon: images[0],
    },
    {
      id: 2,
      name: generateMeaningfulDummyText(),
      icon: images[1],
    },
    {
      id: 3,
      name: generateMeaningfulDummyText(),
      icon: images[2],
    },
  ]);

  const [selectedValue, setSelectedValue] = useState(1);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const currentIndex = values.findIndex(
        (value) => value.id === selectedValue
      );
      if (event.key === "ArrowDown") {
        const nextIndex = (currentIndex + 1) % values.length;
        setSelectedValue(values[nextIndex].id);
      } else if (event.key === "ArrowUp") {
        const prevIndex = (currentIndex - 1 + values.length) % values.length;
        setSelectedValue(values[prevIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [values, selectedValue]);

  const onSubmit = (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.target as HTMLFormElement;
    const input = form.elements[0] as HTMLInputElement;
    const { value } = input;

    const newValues = [...values];

    newValues.push({
      id: Math.floor(Math.random() * 1000000),
      name: value,
      icon: images[Math.floor(Math.random() * 11)],
    });

    setValues(newValues);
    form.reset();
    input.blur();
  };

  return (
    <Wrapper>
      <div className="h-[600px] w-full max-w-4xl">
        <form onSubmit={onSubmit}>
          <label className="flex w-full items-center gap-2 rounded-lg border p-3 text-[#525252] ring-2 ring-transparent ring-offset-2 duration-100 focus-within:ring-[#939393]">
            <FaPlus className="text-[#939393]" />
            <input
              type="text"
              placeholder="insert a plain text"
              className="outline-none placeholder:text-[#939393]"
              onFocus={() => setFormFocus(true)}
              onBlur={() => setFormFocus(false)}
            />
          </label>
        </form>

        <div className="mt-8">
          <header className="flex justify-between border-b py-4 text-[#939393]">
            <h3>Title</h3>
            <p>Created at</p>
          </header>

          <ul className="mt-2">
            {values.map((value) => (
              <EachList
                key={value.id}
                value={value}
                selectedValue={selectedValue}
                formFocus={formFocus}
              />
            ))}
          </ul>
        </div>
      </div>
    </Wrapper>
  );
}
