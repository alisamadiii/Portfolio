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
 * localStorage-first: a fresh cached value (< 20 min old) is used directly and
 * the network query never runs. Only on a cache miss / expiry do we hit
 * `vercel.domains.list`, then write the result back. React Query dedupes by
 * key, so many callers on one screen share a single request.
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
  const hasFreshCache = cached !== null;

  const { data, isSuccess } = useQuery(
    trpc.vercel.domains.list.queryOptions(
      { owner: owner ?? "", repo: repo ?? "" },
      {
        enabled: !!owner && !!repo && !hasFreshCache,
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

  // Persist freshly-fetched results (skip when served from the initial cache).
  useEffect(() => {
    if (!owner || !repo || !isSuccess || hasFreshCache) return;
    writeCache(owner, repo, data?.websiteUrl ?? null);
  }, [owner, repo, isSuccess, hasFreshCache, data?.websiteUrl]);

  const websiteUrl = cached ? cached.url : (data?.websiteUrl ?? null);

  const status: WebsiteUrlStatus = !owner || !repo
    ? "loading"
    : hasFreshCache || isSuccess
      ? websiteUrl
        ? "ready"
        : "missing"
      : "loading";

  return { websiteUrl, status };
}
