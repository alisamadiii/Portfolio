import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ConfigProvider } from "@/contexts/config-context";
import { RepoProvider } from "@/contexts/repo-context";
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

import { RepoLayout } from "@/components/repo/repo-layout";
import { InstallAppOverlay } from "@/components/repo/install-app-overlay";

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
  params: Promise<{ repoId: string }>;
}) {
  const { repoId: repoIdParam } = await params;
  const repoId = Number(repoIdParam);
  if (!Number.isInteger(repoId) || repoId <= 0) {
    return (
      <ErrorCard
        title="Project not found"
        description="This project no longer exists in Client Hub — it may have been removed or renamed."
      />
    );
  }
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
    repoInfo = await caller.cms.repos.getSnapshot.query({ repoId });
  } catch (error: any) {
    switch (error?.data?.code) {
      case "NOT_FOUND":
        // No hub_project row for this repo — the project itself is gone. The
        // server message says exactly why (deleted vs never imported).
        return (
          <ErrorCard
            title="Project not found"
            description={
              error?.message ??
              "This project no longer exists in Client Hub — it may have been removed or renamed."
            }
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
      case "PRECONDITION_FAILED": {
        // The GitHub App isn't installed on this repo (or isn't configured) —
        // getToken can't mint an installation token, so the snapshot read
        // throws before installationStatus is ever consulted. Route to the
        // install overlay, which polls and unlocks itself after the install.
        const access = await caller.cms.repos.installationStatus.query({
          repoId,
        });
        if (access.status === "missing") {
          return (
            <InstallAppOverlay
              owner={access.owner}
              repo={access.repo}
              repoId={repoId}
              installUrl={access.installUrl}
            />
          );
        }
        // Not "missing" per installationStatus, yet the snapshot read was
        // blocked — surface the server's exact error instead of a vague hint.
        return (
          <ErrorCard
            title="GitHub App required"
            description={
              error?.message ??
              "This project needs the GitHub App installed on its repository. Try again in a moment."
            }
          />
        );
      }
      case "UNPROCESSABLE_CONTENT": {
        // The app is installed but its installation can't reach this repo
        // (renamed, or removed from the app's repository access).
        const install = await caller.deploy.appInstallUrl
          .query()
          .catch(() => ({ url: null }));
        return (
          <ErrorCard
            title="GitHub App can't access this repository"
            description={
              error?.message ??
              "The GitHub App's installation does not include this repository. Update the app's repository access to include it."
            }
            action={
              install.url
                ? { href: install.url, label: "Manage app access" }
                : undefined
            }
          />
        );
      }
      default:
        throw error;
    }
  }

  const branchNames = repoInfo.branches ?? [];
  if (branchNames.length === 0) {
    return (
      <ErrorCard
        title="Empty repository"
        description="Push your site's files to this repository first — a plain index.html at the root is enough to get a preview."
      />
    );
  }

  const owner = repoInfo.owner;
  // The repo name is no longer in the URL — it comes back on the snapshot.
  const repo = repoInfo.repo;
  const branch = repoInfo.defaultBranch as string;

  // Push-access gate: the GitHub App must cover the repo (every read, commit
  // and push rides its installation token). "missing" shows a blocking (but
  // translucent) install-app overlay that unlocks itself once installed.
  const access = await caller.cms.repos.installationStatus.query({ repoId });
  const installGate =
    access.status === "missing"
      ? { owner: access.owner, repo: access.repo, installUrl: access.installUrl }
      : null;

  // The v2 canvas reads everything from the root _site.json manifest; the
  // ConfigProvider only carries the repo coordinates.
  const config: Config = {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
    repoId,
    branch,
    sha: "",
    version: "",
    object: {},
  };

  return (
    <RepoProvider repo={repoInfo}>
      <ConfigProvider value={config}>
        <RepoLayout>{children}</RepoLayout>
        {installGate && (
          <InstallAppOverlay
            owner={installGate.owner}
            repo={installGate.repo}
            repoId={repoId}
            installUrl={installGate.installUrl}
          />
        )}
      </ConfigProvider>
    </RepoProvider>
  );
}
