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

/** Standalone error card (no repo/config providers available yet). */
function ErrorCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Empty className="absolute inset-0 rounded-none border-0">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="default"
          render={<Link href="/">Choose another repository</Link>}
        />
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

  // Resolve the repo snapshot. `owner` is resolved server-side (GITHUB_ORG),
  // `branch` defaults to the repo's default branch — neither is in the URL.
  let repoInfo;
  try {
    repoInfo = await caller.cms.repos.getSnapshot.query({ repo });
  } catch (error: any) {
    switch (error?.data?.code) {
      case "NOT_FOUND":
        return (
          <ErrorCard
            title="Repository not found"
            description="It may have been removed, renamed, or the URL may be incorrect."
          />
        );
      case "FORBIDDEN":
        return (
          <ErrorCard
            title="Access denied"
            description="You do not have permission to access this repository."
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
        description={
          'Create a branch and add a ".pages.yml" file to configure this repository.'
        }
      />
    );
  }

  const owner = repoInfo.owner;
  const branch = repoInfo.defaultBranch as string;

  let config: Config = {
    owner: owner.toLowerCase(),
    repo: repo.toLowerCase(),
    branch,
    sha: "",
    version: "",
    object: {},
  };

  let errorMessage = null;

  try {
    const syncedConfig = await caller.cms.settings.getConfig.query({
      owner,
      repo,
      branch,
    });

    if (syncedConfig) {
      config = {
        ...syncedConfig,
        // Dates don't survive JSON serialization over tRPC.
        lastCheckedAt: syncedConfig.lastCheckedAt
          ? new Date(syncedConfig.lastCheckedAt)
          : undefined,
      };
    }
  } catch (error: any) {
    // tRPC surfaces engine HttpErrors as TRPCClientError with `data.code`
    // (404 → NOT_FOUND, 403 → FORBIDDEN); the original message is preserved.
    if (error?.data?.code === "NOT_FOUND") {
      if (error.message === "Not Found") {
        // Let downstream pages (especially /configuration via Entry) handle missing .pages.yml.
      } else {
        errorMessage = (
          <ErrorCard
            title="Repository not found"
            description="It may have been removed, renamed, or the URL may be incorrect."
          />
        );
      }
    } else if (error?.data?.code === "FORBIDDEN") {
      errorMessage = (
        <ErrorCard
          title="Access denied"
          description="You do not have permission to access this repository."
        />
      );
    } else {
      throw error;
    }
  }

  // ImageKit is the sole media provider and needs no per-repo config, so every
  // repo gets it by default. Without this, a v2 repo (cms.json, no .pages.yml)
  // falls back to a config with no mediaSettings and image fields render
  // "No media configuration found". A real value from getConfig wins.
  if (!config.mediaSettings) {
    config = {
      ...config,
      mediaSettings: { provider: DEFAULT_MEDIA_PROVIDER, config: {} },
    };
  }

  return (
    <RepoProvider repo={repoInfo}>
      <ConfigProvider value={config}>
        <MediaLibraryProvider>
          <RepoLayout>{errorMessage ? errorMessage : children}</RepoLayout>
        </MediaLibraryProvider>
      </ConfigProvider>
    </RepoProvider>
  );
}
