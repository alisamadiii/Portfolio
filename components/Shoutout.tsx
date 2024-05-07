import React from "react";

interface Props {
  name: string;
  link: string;
}

export default function Shoutout({ name, link }: Props) {
  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex w-full -translate-x-1/2 items-center justify-center">
      <a
        href={link}
        target="_blank"
        className="text-muted underline duration-150 hover:no-underline active:scale-95" rel="noreferrer"
      >
        Inspired by {name}
      </a>
    </div>
  );
}
