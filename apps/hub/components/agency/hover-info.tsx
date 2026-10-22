"use client";

import type { ReactElement, ReactNode } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";

import { Info } from "@/components/icon";

/**
 * Explanation shown on hover (desktop) or tap (touch). `children` is the
 * trigger; without one, a small info icon is used.
 */
export function HoverInfo({
  title,
  children,
  content,
}: {
  title: string;
  children?: ReactElement;
  content: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={120}
        render={
          children ?? (
            <button
              type="button"
              aria-label={`About ${title}`}
              className="text-muted-foreground hover:text-foreground inline-flex"
            />
          )
        }
        onClick={(event) => event.stopPropagation()}
      >
        {children ? undefined : <Info className="size-3.5" />}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-80 gap-1.5 text-[13px] leading-relaxed"
      >
        <p className="font-semibold">{title}</p>
        {content}
      </PopoverContent>
    </Popover>
  );
}
