"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useTRPC } from "@workspace/trpc/client";

import { useConfig } from "@/contexts/config-context";

const TTL_MS = 20 * 60_000; // 20 minutes

type Cached = { url: string | null; ts: number };

const cacheKey = (owner: string, repo: string) =>
  `hub:websiteUrl:${owner}/${repo}`;

/** Synchronously read the project's cached live URL, if still fresh. */
function readCache(owner?: string, repo?: string): Cached | null {
  if (typeof window === "undefined" || !owner || !repo) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(owner, repo));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (typeof parsed?.ts !== "number") return null;
    if (Date.now() - parsed.ts >= TTL_MS) return null; // expired
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(owner: string, repo: string, url: string | null) {
  if (typeof window === "undefined") return;
  // Only cache a resolved URL. Caching a `null` (domain not linked / not yet
  // synced) would let a transient "missing" shadow a later real value for the
  // whole TTL, so previews would stay broken until something else refetched.
  if (!url) return;
  try {
    const value: Cached = { url, ts: Date.now() };
    window.localStorage.setItem(cacheKey(owner, repo), JSON.stringify(value));
  } catch {
    // ignore quota / private-mode errors
  }
}

export type WebsiteUrlStatus = "loading" | "ready" | "missing";

/**
 * The current project's live website URL (e.g. `https://example.com`), used to
 * resolve root-relative image paths like `/favicon.ico` against the deployed
 * site.
 *
 * localStorage-first for speed, but never localStorage-*only*: a fresh cached
 * URL (< 20 min old) seeds `initialData` so there's an instant value and no
 * spinner, and `staleTime` keeps the network query from actually running while
 * that seed is fresh. The query stays **enabled** regardless, so a cache miss
 * (or a project whose domain was linked/synced after the last visit) resolves
 * on its own — without needing the Domains panel to fetch first. React Query
 * dedupes by key, so many callers on one screen share a single request.
 */
export function useWebsiteUrl(): {
  websiteUrl: string | null;
  status: WebsiteUrlStatus;
} {
  const trpc = useTRPC();
  const { config } = useConfig();
  const owner = config?.owner;
  const repo = config?.repo;

  const cached = readCache(owner, repo);

  const { data, isSuccess, isError } = useQuery(
    trpc.vercel.domains.list.queryOptions(
      { owner: owner ?? "", repo: repo ?? "" },
      {
        enabled: !!owner && !!repo,
        staleTime: TTL_MS,
        retry: false,
        ...(cached
          ? {
              initialData: {
                linked: true as const,
                domains: [],
                websiteUrl: cached.url,
              },
              initialDataUpdatedAt: cached.ts,
            }
          : {}),
      }
    )
  );

  const websiteUrl = data?.websiteUrl ?? null;

  // Persist resolved URLs (writeCache ignores null) so the next visit is instant.
  useEffect(() => {
    if (!owner || !repo || !isSuccess) return;
    writeCache(owner, repo, websiteUrl);
  }, [owner, repo, isSuccess, websiteUrl]);

  const status: WebsiteUrlStatus = !owner || !repo
    ? "loading"
    : isSuccess
      ? websiteUrl
        ? "ready"
        : "missing"
      : isError
        ? "missing"
        : "loading";

  return { websiteUrl, status };
}
