"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Github } from "@workspace/ui/icons/social";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import {
  ArrowUpRight,
  Check,
  CircleCheck,
  Copy,
  KeyRound,
  Loader2,
  RefreshCw,
  Send,
} from "@/components/icon";

/**
 * Full-page gate shown to a repo owner/admin when the agency GitHub account is
 * not yet a collaborator. One click sends a collaborator invite via the owner's
 * token; the page then waits (polling) until the agency accepts and unlocks the
 * canvas automatically. Falls back to GitHub's Manage-access page if the viewer
 * lacks admin.
 */
export function GitHubAccessOverlay({
  owner,
  login,
  repo,
  invited = false,
}: {
  owner: string;
  login: string;
  repo: string;
  invited?: boolean;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [linkFallback, setLinkFallback] = useState(false);
  // Pending = the invite exists but the agency hasn't accepted it yet.
  const [pending, setPending] = useState(invited);
  // Success = access confirmed; we flash a green "granted" state, then fade the
  // whole overlay out before unlocking the canvas.
  const [success, setSuccess] = useState(false);
  const [exiting, setExiting] = useState(false);

  const accessUrl = `https://github.com/${owner}/${repo}/settings/access`;

  // While pending, poll access — the moment the invite is accepted (status
  // "ok"), play the success + exit sequence, then re-run the server layout.
  const poll = useQuery(
    trpc.cms.repos.agencyAccess.queryOptions(
      { repo },
      { enabled: pending && !success, refetchInterval: 4000 }
    )
  );
  // Detect acceptance → enter success. (Kept separate from the timers below so
  // flipping `success` doesn't tear down the exit sequence via effect cleanup.)
  useEffect(() => {
    if (pending && !success && poll.data?.status === "ok") setSuccess(true);
  }, [pending, success, poll.data?.status]);

  // Once in success: flash green, fade, then unlock. Runs once (success only
  // ever goes false→true); cleanup fires only on unmount.
  useEffect(() => {
    if (!success) return;
    const fade = setTimeout(() => setExiting(true), 1000);
    const unlock = setTimeout(() => router.refresh(), 1500);
    return () => {
      clearTimeout(fade);
      clearTimeout(unlock);
    };
  }, [success, router]);

  const grant = useMutation(
    trpc.cms.repos.grantAgencyAccess.mutationOptions({
      onSuccess: (data) => {
        if (data.status === "active") {
          toast.success("Access granted.");
          router.refresh();
        } else {
          toast.success(`Invitation sent to @${login}.`);
          setPending(true);
        }
      },
      onError: (error) => {
        // Most likely the viewer lacks admin — surface the manual path.
        setLinkFallback(true);
        toast.error(error.message);
      },
    })
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(login);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div
      className={cn(
        "from-primary/10 via-background/40 to-background/40 fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-500",
        exiting && "opacity-0",
        // success wins (pending is still true when it fires); overriding
        // --primary here recolors the backdrop + every primary utility below.
        success ? "[--primary:#10b981]" : pending ? "[--primary:#f59e0b]" : ""
      )}
    >
      <div className="motion-opacity-in-0 bg-primary/90 absolute inset-0 mask-t-from-50 backdrop-blur-md transition-colors duration-700" />
      <div className="bg-background motion-opacity-in-0 motion-scale-in-90 relative z-10 w-full max-w-md rounded-2xl border p-7 shadow-xl">
        {success ? (
          <div className="motion-opacity-in-0">
            <div className="text-primary bg-primary/10 flex size-11 items-center justify-center rounded-xl">
              <CircleCheck className="size-5" />
            </div>
            <h1 className="mt-4 text-[19px] font-semibold tracking-tight">
              Access granted
            </h1>
            <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
              <span className="text-foreground font-medium">@{login}</span> now
              has access to{" "}
              <span className="text-foreground font-medium">
                {owner}/{repo}
              </span>
              . Opening your project…
            </p>
          </div>
        ) : pending ? (
          <>
            <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
              <Send className="size-5" />
            </div>
            <h1 className="mt-4 text-[19px] font-semibold tracking-tight">
              Invitation sent
            </h1>
            <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
              We've invited{" "}
              <span className="text-foreground font-medium">@{login}</span> to{" "}
              <span className="text-foreground font-medium">
                {owner}/{repo}
              </span>
              . We'll accept it shortly — this page unlocks automatically once
              access is live.
            </p>

            <div className="text-muted-foreground bg-muted/50 mt-4 flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px]">
              <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
              Waiting for the invitation to be accepted…
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                variant="outline"
                isLoading={poll.isFetching}
                onClick={() => poll.refetch()}
                className="h-12 w-full"
              >
                <RefreshCw className="size-4" />
                Check again
              </Button>
              <a
                href={accessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-center text-[12.5px]"
              >
                Manage access on GitHub
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
              <KeyRound className="size-5" />
            </div>

            <h1 className="mt-4 text-[19px] font-semibold tracking-tight">
              Grant GitHub access
            </h1>
            <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
              To manage and publish{" "}
              <span className="text-foreground font-medium">
                {owner}/{repo}
              </span>
              , add our GitHub account as a collaborator on the repository.
            </p>

            {/* username chip */}
            <button
              type="button"
              onClick={copy}
              className="hover:bg-muted mt-4 flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-left transition"
            >
              <Github className="size-4 shrink-0" />
              <span className="flex-1 truncate text-[14px] font-medium">
                @{login}
              </span>
              {copied ? (
                <Check className="text-primary size-4" />
              ) : (
                <Copy className="text-muted-foreground size-4" />
              )}
            </button>

            <div className="mt-5 flex flex-col gap-2">
              {linkFallback ? (
                <Button
                  className="h-12 w-full"
                  render={
                    <a
                      href={accessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open GitHub access settings
                      <ArrowUpRight className="size-4" />
                    </a>
                  }
                />
              ) : (
                <Button
                  className="h-12 w-full"
                  isLoading={grant.isPending}
                  onClick={() => grant.mutate({ repo })}
                  size="lg"
                >
                  Grant access
                </Button>
              )}
              <a
                href={accessUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-center text-[12.5px]"
              >
                or add it yourself on GitHub
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
