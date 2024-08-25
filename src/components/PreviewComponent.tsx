"use client";

import React from "react";

import { Index } from "@/__registry__";
import { cn } from "@/utils";

interface Props {
  name: string;
  children: React.ReactNode;
  className?: string;
}

export default function ComponentPreview({ name, className }: Props) {
  const Component = Index[name].component;

  return (
    <div
      className={cn(
        "relative mb-12 flex min-h-96 items-center justify-center overflow-hidden rounded-md border-wrapper py-8",
        className
      )}
    >
      <Component />
    </div>
  );
}
