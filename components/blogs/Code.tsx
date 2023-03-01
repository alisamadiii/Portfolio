import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function Code({ children }: Props) {
  return <code className="p-1 rounded-md bg-[#e1e1e1]">{children}</code>;
}
