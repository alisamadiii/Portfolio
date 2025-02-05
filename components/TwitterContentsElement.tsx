import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { Maximize } from "lucide-react";
import { useFullscreen, useToggle } from "react-use";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function Wrapper({ children, className }: Props) {
  return <div className={cn("relative mb-12", className)}>{children}</div>;
}

export function Code({ children, className }: Props) {
  return (
    <div className={cn("mx-auto mb-[10px] max-w-3xl", className)}>
      {children}
    </div>
  );
}

export function Preview({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const [show, toggle] = useToggle(false);
  const isFullscreen = useFullscreen(ref, show, {
    onClose: () => toggle(false),
  });

  return (
    <div data-preview className="relative [&+[data-preview]]:mt-6">
      <div
        ref={ref}
        className={cn(
          "border-wrapper relative isolate mx-auto flex min-h-96 max-w-3xl flex-col items-center justify-center gap-4 overflow-hidden rounded-md bg-natural-150 px-8 py-8 shadow-custom-card",
          className
        )}
      >
        {children}
        {!isFullscreen && (
          <button
            className="absolute right-2 top-2"
            onClick={() => toggle(true)}
          >
            <Maximize size={16} />
          </button>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 -inset-y-[6px] border-y-2 border-dashed border-natural-200"></div>
    </div>
  );
}

export function Settings({ children, className }: Props) {
  return (
    <div className={cn("mx-auto mt-[48px] max-w-3xl px-4", className)}>
      {children}
    </div>
  );
}
