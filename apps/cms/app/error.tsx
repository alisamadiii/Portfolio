"use client";

import { useEffect } from "react";
import Link from "next/link";

import { buttonVariants } from "@workspace/ui/components/button-variants";
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
        <EmptyDescription>{error.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Link className={buttonVariants({ variant: "default" })} href="/">
          Go home
        </Link>
        <button
          className={buttonVariants({ variant: "outline" })}
          onClick={reset}
        >
          Try again
        </button>
      </EmptyContent>
    </Empty>
  );
}
