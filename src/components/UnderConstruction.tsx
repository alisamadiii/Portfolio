import React from "react";

type Props = {};

export default function UnderConstruction({}: Props) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-black text-center md:text-4xl lg:text-6xl animate-pulse">
        Under Construction...
      </h1>
    </div>
  );
}
