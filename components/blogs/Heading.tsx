import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function Heading({ children }: Props) {
  return <h1 className="my-8 text-3xl font-bold md:text-5xl">{children}</h1>;
}
