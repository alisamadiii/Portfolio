import React from "react";
import { Text } from "./ui/text";

interface Props {
  number: number;
  gradient: 1 | 2 | 3;
  title?: string;
}

export default function NumberGradient({ gradient, number, title }: Props) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`h-28 w-[0.5px] bg-gradient-to-t from-gradient-${gradient}-from to-transparent`}
      />
      <div
        className={`mb-3 flex h-10 w-10 -translate-y-3 items-center justify-center rounded-full bg-gradient-to-r font-medium text-black from-gradient-${gradient}-from to-gradient-${gradient}-to`}
      >
        {number}
      </div>
      {title && (
        <Text
          as="h2"
          size={32}
          className={`bg-gradient-to-r bg-clip-text font-bold text-transparent from-gradient-${gradient}-from to-gradient-${gradient}-to`}
        >
          {title}
        </Text>
      )}
    </div>
  );
}
