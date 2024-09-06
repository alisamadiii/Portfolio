"use client";

import React, { Fragment } from "react";

import { Index } from "@/__registry__";
import { cn } from "@/utils";
import { useFullscreen } from "@mantine/hooks";

interface Props {
  name: string;
  children: React.ReactNode;
  className?: string;
}

export default function ComponentPreview({ name, className }: Props) {
  const Component = Index[name].component;
  const { toggle, fullscreen } = useFullscreen();

  const Element = fullscreen ? "div" : Fragment;

  return (
    <Element className="fixed left-0 top-0 flex h-full w-full items-center justify-center bg-background">
      <div
        id="preview-container"
        className={cn(
          "relative mb-12 flex min-h-96 flex-col items-center justify-center overflow-hidden rounded-md border-wrapper py-8",
          fullscreen && "max-w-3xl border-none",
          className
        )}
      >
        {!fullscreen && (
          <div className="w-full px-4 pb-4">
            <button
              className="h-8 rounded-md bg-foreground px-4 text-sm text-background"
              onClick={toggle}
            >
              See only the content
            </button>
          </div>
        )}
        <Component />
      </div>
    </Element>
  );
}
