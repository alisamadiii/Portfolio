"use client";

import React from "react";

import { NewIndex } from "./designs";

export default function Home() {
  const Component = NewIndex["50-day-challenge"].find(
    (value) => value.name.toLowerCase() === "day-30"
  )?.component;

  return (
    Component && (
      <main className="flex h-dvh items-center justify-center">
        <Component />
      </main>
    )
  );
}
