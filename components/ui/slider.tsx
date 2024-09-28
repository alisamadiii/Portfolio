"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "group relative flex h-[10px] w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className="relative h-[6px] w-full grow overflow-hidden rounded-full bg-[#efefef] ease-linear group-active:h-[10px] group-active:scale-x-[1.02] dark:bg-white/20"
      style={{ transition: "75ms" }}
    >
      <SliderPrimitive.Range className="absolute h-full bg-[#5d5d5d] transition-colors group-hover:bg-primary dark:bg-white/70" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
