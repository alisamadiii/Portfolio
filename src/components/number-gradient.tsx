import React from "react";
import { Text } from "./ui/text";

type Props = {
  number: number;
  gradient: 1 | 2 | 3;
  title?: string;
};

export default function NumberGradient({ gradient, number, title }: Props) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-[0.5px] h-28 bg-gradient-to-t from-gradient-${gradient}-from to-transparent`}
      />
      <div
        className={`flex items-center justify-center w-10 h-10 font-medium text-black rounded-full mb-3 -translate-y-3 bg-gradient-to-r from-gradient-${gradient}-from to-gradient-${gradient}-to`}
      >
        {number}
      </div>
      {title && (
        <Text
          as="h2"
          size={32}
          className={`font-bold bg-clip-text text-transparent bg-gradient-to-r from-gradient-${gradient}-from to-gradient-${gradient}-to`}
        >
          {title}
        </Text>
      )}
    </div>
  );
}
