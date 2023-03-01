import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function Anchor({ ...props }: Props) {
  return (
    <a
      className="px-[3px] py-1 font-bold text-blue-700 rounded-md hover:bg-blue-700 hover:text-white duration-100"
      {...props}
      target="_blank"
    />
  );
}
