import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function Text({ children }: Props) {
  return (
    <p className="my-3 text-lg leading-9 md:leading-9 md:text-xl">{children}</p>
  );
}
