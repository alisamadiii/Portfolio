"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

import { useTRPC } from "@workspace/trpc/client";

import { Button } from "@/components/ds/ui/button";

import { useNewsletter } from "./use-newsletter";

/** Mirrors NOT_SET_UP in packages/trpc/src/lib/newsletter.ts. */
const NOT_SET_UP = "The newsletter isn't set up for this project yet.";

/**
 * The real error from a failed Newsletter query, with a retry. A workspace
 * that turned out to be invalid flips the page back to "Set up newsletter".
 */
export function QueryError({
  error,
  onRetry,
}: {
  error: { message: string } | null | undefined;
  onRetry?: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { projectId } = useNewsletter();
  const notSetUp = error?.message === NOT_SET_UP;

  useEffect(() => {
    if (notSetUp) {
      void queryClient.invalidateQueries({
        queryKey: trpc.newsletter.status.queryKey({ projectId }),
      });
    }
  }, [notSetUp, queryClient, trpc, projectId]);

  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-3 rounded-card border border-danger/30 bg-danger-soft px-4 py-3 text-[13px]"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-danger">Something went wrong</span>
        <span className="break-words text-ink-3">{error.message}</span>
      </div>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
