"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/icon";

import { Button } from "@workspace/ui/components/button";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { authClient } from "@/lib/auth-client";

type InviteState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "wrong_account" }
  | { status: "ready"; destinationPath: string }
  | {
      status: "signin_required";
      maskedEmail: string;
      destinationPath: string;
    };

export function InviteSignIn({ token }: { token: string }) {
  const [pending, setPending] = useState(false);

  // One-shot load — a focus refetch could flip state after acceptance,
  // so refetching is disabled. Endpoint returns the state union as JSON
  // regardless of HTTP status (current behavior preserved).
  const inviteQuery = useQuery({
    queryKey: [`/api/collaborator-invites/${encodeURIComponent(token)}`],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/collaborator-invites/${encodeURIComponent(token)}`,
        { signal }
      );
      return (await response.json()) as InviteState;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const state: InviteState = inviteQuery.isPending
    ? { status: "loading" }
    : inviteQuery.isError
      ? { status: "unavailable" }
      : inviteQuery.data;

  useEffect(() => {
    if (state.status === "ready") {
      window.location.assign(state.destinationPath);
    }
  }, [state]);

  const shellClassName = "absolute inset-0 border-0 rounded-none";
  // Auth now lives in this app — bounce through /sign-in and back here
  const signInUrl = `/sign-in?redirect=${encodeURIComponent(
    `/sign-in/collaborator?token=${token}`
  )}`;

  if (state.status === "loading" || state.status === "ready") {
    return (
      <Empty className={shellClassName}>
        <Loader className="text-muted-foreground size-5 animate-spin" />
      </Empty>
    );
  }

  if (state.status === "unavailable") {
    return (
      <Empty className={shellClassName}>
        <EmptyHeader>
          <EmptyTitle>Invite unavailable</EmptyTitle>
          <EmptyDescription>
            This invitation is no longer available.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link href="/sign-in" className={buttonVariants()}>
            Sign in
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  if (state.status === "wrong_account") {
    return (
      <Empty className={shellClassName}>
        <EmptyHeader>
          <EmptyTitle>Wrong account</EmptyTitle>
          <EmptyDescription>
            This invitation was sent to another account.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await authClient.signOut();
                window.location.reload();
              } finally {
                setPending(false);
              }
            }}
          >
            Sign out
            {pending && <Loader className="size-4 animate-spin" />}
          </Button>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Go home
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <Empty className={shellClassName}>
      <EmptyHeader>
        <EmptyTitle>You&apos;ve been invited</EmptyTitle>
        <EmptyDescription>
          This invitation was sent to {state.maskedEmail}. Sign in with that
          email to accept it.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <a href={signInUrl} className={buttonVariants()}>
          Sign in to accept
        </a>
      </EmptyContent>
    </Empty>
  );
}
