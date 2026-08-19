"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { Spinner } from "@workspace/ui/components/spinner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";

/**
 * Shared error state for the Site Settings panels (Billing, Domain, …):
 * the query failed, show why and offer a retry.
 */
export function PanelError({
  title = "Something went wrong",
  message,
  onRetry,
  retrying = false,
}: {
  title?: string;
  message?: string;
  onRetry: () => void;
  retrying?: boolean;
}) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertTriangle className="size-5" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          {message || "The request failed. Check your connection and retry."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          className="rounded-full px-5"
          disabled={retrying}
          onClick={onRetry}
        >
          {retrying ? <Spinner /> : <RefreshCw className="size-4" />}
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
