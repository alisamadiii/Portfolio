"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@workspace/ui/components/button";
import { Github } from "@workspace/ui/icons/social";
import { cn } from "@workspace/ui/lib/utils";

import { useTRPC } from "@workspace/trpc/client";

import {
  ArrowUpRight,
  CircleCheck,
  Loader2,
  RefreshCw,
} from "@/components/icon";

/**
 * Full-page gate shown when the GitHub App's installation does not cover the
 * repo. The owner installs the app on GitHub; the page polls until the
 * installation is live, then unlocks the canvas automatically.
 */
export function InstallAppOverlay({
  owner,
  repo,
  repoId,
  installUrl,
}: {
  owner: string;
  repo: string;
  repoId: number;
  installUrl: string | null;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Poll until the installation covers the repo, then play the success + exit
  // sequence and re-run the server layout.
  const poll = useQuery(
    trpc.cms.repos.installationStatus.queryOptions(
      { repoId },
      { enabled: !success, refetchInterval: 4000 }
    )
  );
  useEffect(() => {
    if (!success && poll.data?.status === "ok") setSuccess(true);
  }, [success, poll.data?.status]);

  useEffect(() => {
    if (!success) return;
    const fade = setTimeout(() => setExiting(true), 1000);
    const unlock = setTimeout(() => router.refresh(), 1500);
    return () => {
      clearTimeout(fade);
      clearTimeout(unlock);
    };
  }, [success, router]);

  return (
    <div
      className={cn(
        "from-primary/10 via-background/40 to-background/40 fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-500",
        exiting && "opacity-0",
        success && "[--primary:#10b981]"
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
              App installed
            </h1>
            <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
              The GitHub App now covers{" "}
              <span className="text-foreground font-medium">
                {owner}/{repo}
              </span>
              . Opening your project…
            </p>
          </div>
        ) : (
          <>
            <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
              <Github className="size-5" />
            </div>

            <h1 className="mt-4 text-[19px] font-semibold tracking-tight">
              Install the GitHub App
            </h1>
            <p className="text-muted-foreground mt-1.5 text-[14px] leading-relaxed">
              To manage and publish{" "}
              <span className="text-foreground font-medium">
                {owner}/{repo}
              </span>
              , install our GitHub App on the repository. It only needs access
              to the repositories you pick, and you can remove it any time.
            </p>

            <div className="text-muted-foreground bg-muted/50 mt-4 flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px]">
              <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
              This page unlocks automatically once the app is installed.
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {installUrl && (
                <Button
                  className="h-12 w-full"
                  size="lg"
                  render={
                    <a href={installUrl} target="_blank" rel="noopener noreferrer">
                      Install on GitHub
                      <ArrowUpRight className="size-4" />
                    </a>
                  }
                />
              )}
              <Button
                variant="outline"
                isLoading={poll.isFetching}
                onClick={() => poll.refetch()}
                className="h-12 w-full"
              >
                <RefreshCw className="size-4" />
                Check again
              </Button>
              <p className="text-muted-foreground text-center text-[12.5px]">
                No admin access on this repository? Ask its owner to install the
                app.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
