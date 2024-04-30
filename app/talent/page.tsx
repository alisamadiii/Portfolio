"use client";

import React from "react";

import { NewIndex } from "./designs";

export default function Home() {
  const Component = NewIndex.general[3].component;

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white text-black">
      <Component />
    </main>
  );
}
