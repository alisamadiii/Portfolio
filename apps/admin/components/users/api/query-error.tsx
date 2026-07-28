"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

// Shared load-failure state for the API tab. Errors here are AgencyErrors
// from the proxy/worker (readable message, optional causeHint) or network
// failures — show the message and offer a retry.
export function QueryError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: Error;
  onRetry: () => void;
}) {
  const hint =
    "causeHint" in error && typeof error.causeHint === "string"
      ? error.causeHint
      : undefined;

  return (
    <div className="border-destructive/30 bg-destructive/5 flex flex-col items-center gap-3 rounded-xl border px-4 py-8 text-center">
      <AlertCircle className="text-destructive size-5" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {error.message}
          {hint && ` — ${hint}`}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
