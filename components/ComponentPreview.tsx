"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { Index } from "../__registry__";

interface Props {
  name: string;
  children: React.ReactNode;
  className?: string;
}

export default function ComponentPreview({ name, className }: Props) {
  const Component = Index[name].component;

  if (name.includes("twitter-contents")) {
    return <Component />;
  }

  return (
    <div
      id="preview-container"
      className={cn(
        "border-wrapper relative mx-auto flex min-h-96 max-w-3xl flex-col items-center justify-center overflow-hidden rounded-md bg-natural-150 px-8 py-8 shadow-custom-card",
        className
      )}
    >
      <Component />
    </div>
  );
}
