"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader } from "lucide-react";

import { Button } from "@workspace/ui/components/button";
import { buttonVariants } from "@workspace/ui/components/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { portalLoginUrl, urls } from "@workspace/ui/lib/company";

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
  const [state, setState] = useState<InviteState>({ status: "loading" });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setState({ status: "loading" });
      try {
        const response = await fetch(
          `/api/collaborator-invites/${encodeURIComponent(token)}`
        );
        const next = (await response.json()) as InviteState;
        if (!cancelled) setState(next);
      } catch {
        if (!cancelled) setState({ status: "unavailable" });
      }
    }

    void loadInvite();

    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (state.status === "ready") {
      window.location.assign(state.destinationPath);
    }
  }, [state]);

  const shellClassName = "absolute inset-0 border-0 rounded-none";
  const portalUrl = portalLoginUrl(
    `${urls.cms}/sign-in/collaborator?token=${encodeURIComponent(token)}`
  );

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
        <a href={portalUrl} className={buttonVariants()}>
          Sign in to accept
        </a>
      </EmptyContent>
    </Empty>
  );
}
