import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function Heading1({ children }: Props) {
  return <h1>{children}</h1>;
}

export function Heading2({ children }: Props) {
  return <h2>{children}</h2>;
}
