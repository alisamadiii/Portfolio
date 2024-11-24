"use client";

import React, { useRef } from "react";

import { cn } from "@/lib/utils";
import { Index } from "../__registry__";

interface Props {
  name: string;
  children: React.ReactNode;
  className?: string;
}

export default function ComponentPreview({ name, className }: Props) {
  const Component = Index[name].component;

  const ref = useRef<HTMLDivElement>(null);

  if (name.includes("twitter-contents")) {
    return <Component />;
  }

  return (
    <>
      <div
        ref={ref}
        id="preview-container"
        className={cn(
          "border-wrapper relative mx-auto flex min-h-96 max-w-3xl flex-col items-center justify-center overflow-hidden rounded-md bg-natural-150 px-8 py-8 shadow-custom-card",
          className
        )}
      >
        <Component />
      </div>
      <div className="mx-auto mt-2 w-full max-w-3xl px-4">
        <button
          className="text-sm text-natural-600 hover:text-natural-800"
          onClick={() => {
            if (ref.current) {
              ref.current.requestFullscreen();
            }
          }}
        >
          maximize
        </button>
      </div>
    </>
  );
}
