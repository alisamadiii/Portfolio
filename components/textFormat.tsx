import React from "react";

interface Props {
  value: string;
}

export default function TextFormat({ value }: Props) {
  return (
    <p className="flex flex-col">
      {value.split("\\n").map((text, index) => (
        <small key={index} className="text-base">
          {text}
        </small>
      ))}
    </p>
  );
}
