import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function ContentWrapper({ children }: Props) {
  return (
    <div className="relative mx-auto flex max-w-2xl flex-col max-md:px-4">
      {children}
    </div>
  );
}
