"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@workspace/trpc/client";
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
  const trpc = useTRPC();

  // One-shot load — a focus refetch could flip state after acceptance,
  // so refetching is disabled. The query is read-only; acceptance happens
  // via the `claim` mutation once the invite resolves to "ready".
  const inviteQuery = useQuery(
    trpc.cms.collaborators.getInvite.queryOptions(
      { token },
      { staleTime: Infinity, refetchOnWindowFocus: false, retry: false }
    )
  );
  const claim = useMutation(trpc.cms.collaborators.claim.mutationOptions());

  const resolved: InviteState = inviteQuery.isPending
    ? { status: "loading" }
    : inviteQuery.isError
      ? { status: "unavailable" }
      : inviteQuery.data;

  // While claiming (or once claimed "ready") keep showing the loader; a
  // non-ready claim result (wrong account / gone) takes over the display.
  const state: InviteState =
    claim.data && claim.data.status !== "ready"
      ? claim.data
      : claim.isError
        ? { status: "unavailable" }
        : resolved;

  useEffect(() => {
    if (resolved.status === "ready" && claim.isIdle) {
      claim.mutate(
        { token },
        {
          onSuccess: (res) => {
            if (res.status === "ready") {
              window.location.assign(res.destinationPath);
            }
          },
        }
      );
    }
  }, [resolved, claim, token]);

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
