import { queryOptions, type QueryClient } from "@tanstack/react-query";

import { requireApiSuccess } from "@/lib/api-client";

export async function apiFetch<T = any>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, init);
  return requireApiSuccess<T>(response, "Request failed");
}

/**
 * SWR-like GET. The queryKey is the URL itself, so identical URLs dedupe
 * across components exactly like SWR's url-keyed cache did. staleTime 2s
 * mirrors the old dedupingInterval; window-focus refetch is RQ's default.
 */
export function apiQueryOptions<T = any>(url: string) {
  return queryOptions<T>({
    queryKey: [url],
    queryFn: ({ signal }) => apiFetch<T>(url, { signal }),
    staleTime: 2_000,
  });
}

/** SWR-style broadcast invalidation over URL-string query keys. */
export function invalidateUrlKeys(
  queryClient: QueryClient,
  match: (url: string) => boolean
) {
  return queryClient.invalidateQueries({
    predicate: (query) =>
      typeof query.queryKey[0] === "string" && match(query.queryKey[0]),
  });
}
