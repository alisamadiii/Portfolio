import React, { ReactNode } from "react";

type Props = {
  children: ReactNode;
  to: string;
};

export default function Button({ children, to }: Props) {
  return (
    <a
      href={to}
      target="_blank"
      className="inline-block px-4 py-1 text-white rounded-md bg-primary hover:bg-primary/80"
    >
      {children}
    </a>
  );
}
