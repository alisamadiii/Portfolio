import { headers } from "next/headers";
import Link from "next/link";

import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@workspace/ui/components/empty";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { ProjectSeed } from "@/components/query-seeds";
import { RepoLayout } from "@/components/repo/repo-layout";
import { InstallAppOverlay } from "@/components/repo/install-app-overlay";

/** Standalone error card (no repo/config providers available yet). */
export function ErrorCard({
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

/**
 * Resolves a project's repo snapshot (GitHub/upload workspace) and seeds it for
 * useRepo()/useProject(), or renders the matching error card / install overlay.
 * Wraps every editor route: the website editor and an agency project's Website.
 */
export async function ProjectSnapshotGate({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const caller = createHttpCaller(await headers());

  // Resolve the repo snapshot. `owner` is resolved server-side from the project
  // catalog, `branch` defaults to the repo's default branch — neither is in the URL.
  let repoInfo;
  try {
    repoInfo = await caller.cms.repos.getSnapshot.query({ projectId });
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
          projectId,
        });
        if (access.status === "missing") {
          return (
            <InstallAppOverlay
              owner={access.owner}
              repo={access.repo}
              projectId={projectId}
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

  // Push-access gate: the GitHub App must cover the repo (every read, commit
  // and push rides its installation token). "missing" shows a blocking (but
  // translucent) install-app overlay that unlocks itself once installed.
  const access = await caller.cms.repos.installationStatus.query({ projectId });
  const installGate =
    access.status === "missing"
      ? { owner: access.owner, repo: access.repo, installUrl: access.installUrl }
      : null;

  // Hand the snapshot to React Query: useRepo() / useProject() read it from
  // the cache, so it's there on the first render and stays live.
  return (
    <ProjectSeed projectId={projectId} snapshot={repoInfo}>
        <RepoLayout>{children}</RepoLayout>
        {installGate && (
          <InstallAppOverlay
            owner={installGate.owner}
            repo={installGate.repo}
            projectId={projectId}
            installUrl={installGate.installUrl}
          />
        )}
    </ProjectSeed>
  );
}
