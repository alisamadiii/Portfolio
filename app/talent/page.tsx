"use client";

import React from "react";

import { NewIndex } from "./designs";

export default function Home() {
  const Component = NewIndex["50-day-challenge"].find(
    (value) => value.name.toLowerCase() === "day-2"
  )?.component;

  return (
    Component && (
      <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white text-black">
        <Component />
      </main>
    )
  );
}
