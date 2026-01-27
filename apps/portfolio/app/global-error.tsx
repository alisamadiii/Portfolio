"use client";

import { Bug, RefreshCcw } from "lucide-react";

import { Button, buttonVariants } from "@workspace/ui/components/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="bg-muted flex h-full min-h-dvh w-full flex-col items-center justify-center">
      <div className="bg-background flex w-full max-w-64 flex-col items-center justify-center gap-4 rounded-2xl p-4 text-center shadow-sm">
        <Bug size={48} className="text-destructive" />
        <p className="text-muted-foreground leading-[130%]">{error.message}</p>
        <div className="mt-4 flex w-full flex-col gap-2">
          <Button size="sm" className="w-full" onClick={reset}>
            <RefreshCcw size={16} />
            Try again
          </Button>
          <a
            href="mailto:support@example.com"
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "w-full",
            })}
          >
            Contact support
          </a>
        </div>
      </div>
    </div>
  );
}
