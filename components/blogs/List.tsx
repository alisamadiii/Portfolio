import React from "react";

type Props = {
  children: React.ReactNode;
};

export function List({ children }: Props) {
  return <ul className="pl-8 space-y-3 list-disc">{children}</ul>;
}
