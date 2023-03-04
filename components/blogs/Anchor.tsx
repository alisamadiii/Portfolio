import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function Anchor({ ...props }: Props) {
  return (
    <a
      id="anchor"
      className="relative px-[3px] py-1 font-bold text-blue-700 rounded-md hover:text-white duration-100 overflow-hidden"
      {...props}
      target="_blank"
    />
  );
}
