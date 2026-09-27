import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfigProvider } from "@/contexts/config-context";
import { RepoProvider } from "@/contexts/repo-context";
import { DEFAULT_MEDIA_PROVIDER } from "@workspace/cms-core/media-providers";
import type { Config } from "@workspace/cms-core/types/config";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { getServerSession } from "@/lib/session-server";

import { MediaLibraryProvider } from "@/components/media/media-library-panel";
import { RepoLayout } from "@/components/repo/repo-layout";
import { GitHubAccessOverlay } from "@/components/repo/github-access-overlay";

/** Standalone error card (no repo/config providers available yet). */
function ErrorCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  const { href, label } = action ?? { href: "/", label: "Choose another repository" };
  return (
    <Empty className="absolute inset-0 rounded-none border-0">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="default" render={<Link href={href}>{label}</Link>} />
      </EmptyContent>
    </Empty>
  );
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ repo: string }>;
}) {
  const { repo } = await params;
  const requestHeaders = await headers();
  const session = await getServerSession();
  const user = session?.user;
  const returnTo = requestHeaders.get("x-return-to");
  const signInUrl =
    returnTo && returnTo !== "/sign-in"
      ? `/sign-in?redirect=${encodeURIComponent(returnTo)}`
      : "/sign-in";
  if (!user) return redirect(signInUrl);

  const caller = createHttpCaller(requestHeaders);

  // Resolve the repo snapshot. `owner` is resolved server-side from the project
  // catalog, `branch` defaults to the repo's default branch — neither is in the URL.
  let repoInfo;
  try {
    repoInfo = await caller.cms.repos.getSnapshot.query({ repo });
  } catch (error: any) {
    switch (error?.data?.code) {
      case "NOT_FOUND":
        // No hub_project row for this repo — the project itself is gone.
        return (
          <ErrorCard
            title="Project not found"
            description="This project no longer exists in Client Hub — it may have been removed or renamed."
          />
        );
      case "FORBIDDEN":
        // The caller has no Hub access to this project (not a collaborator).
        return (
          <ErrorCard
            title="You don't have access"
            description="You're not a collaborator on this project. Ask the project owner to invite your email, then open it from the invitation link."
          />
        );
      case "PRECONDITION_FAILED":
        // GitHub isn't connected at all — Client Hub opens every project with
        // the signed-in user's own GitHub token (whether they own it or were
        // invited as a collaborator).
        return (
          <ErrorCard
            title="Connect your GitHub"
            description="Connect your GitHub account — one that has access to this repository — to open, edit, and publish this project."
            action={{ href: "/integrations", label: "Connect GitHub" }}
          />
        );
      case "UNPROCESSABLE_CONTENT":
        // Connected to GitHub, but that account can't reach this repo. The
        // server message names the repo and the exact remedy.
        return (
          <ErrorCard
            title="GitHub access required"
            description={
              error?.message ??
              "Your connected GitHub account can't access this repository. Ask the repository owner to add you as a collaborator on GitHub, then reconnect your GitHub."
            }
            action={{ href: "/integrations", label: "Reconnect GitHub" }}
          />
        );
      default:
        throw error;
    }
  }

  const branchNames = repoInfo.branches ?? [];
  if (branchNames.length === 0) {
    return (
      <ErrorCard
        title="Empty repository"
        description="Create a branch and add a _site.json file at the repo root to configure this project."
      />
    );
  }

  const owner = repoInfo.owner;
  const branch = repoInfo.defaultBranch as string;

  // Agency-access gate: the agency GitHub account must be a collaborator on the
  // repo (content-pilot commits with it). If it's missing, the repo owner/admin
  // gets a blocking (but translucent) overlay over the canvas to add it. Only
  // admins ever see `missing`.
  const agency = await caller.cms.repos.agencyAccess.query({ repo });
  const agencyGate =
    agency.status === "missing" || agency.status === "invited"
      ? {
          owner: agency.owner,
          login: agency.login,
          invited: agency.status === "invited",
        }
      : null;

  // The v2 canvas reads everything from the root _site.json manifest; the
  // ConfigProvider only carries the repo coordinates and default media settings.
  // (ImageKit is the sole media provider and needs no per-repo config.)
  const config: Config = {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
    branch,
    sha: "",
    version: "",
    object: {},
    mediaSettings: { provider: DEFAULT_MEDIA_PROVIDER, config: {} },
  };

  return (
    <RepoProvider repo={repoInfo}>
      <ConfigProvider value={config}>
        <MediaLibraryProvider>
          <RepoLayout>{children}</RepoLayout>
          {agencyGate && (
            <GitHubAccessOverlay
              owner={agencyGate.owner}
              login={agencyGate.login}
              repo={repo}
              invited={agencyGate.invited}
            />
          )}
        </MediaLibraryProvider>
      </ConfigProvider>
    </RepoProvider>
  );
}
