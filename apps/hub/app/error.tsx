"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Empty className="absolute inset-0 rounded-none border-0">
      <EmptyHeader>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          We hit a temporary problem loading this page. Try again in a moment —
          if it keeps happening, contact your admin.
        </EmptyDescription>
        {error.message && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground break-words">
            {error.message}
          </p>
        )}
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Button variant="default" render={<Link href="/">Go home</Link>} />
      </EmptyContent>
    </Empty>
  );
}
