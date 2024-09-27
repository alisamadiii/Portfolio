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

  return (
    <div
      id="preview-container"
      className={cn(
        "relative mb-12 bg-natural-150 shadow-custom-card max-w-3xl mx-auto flex min-h-96 flex-col items-center justify-center overflow-hidden rounded-md border-wrapper py-8",
        className,
      )}
    >
      <Component />
    </div>
  );
}
