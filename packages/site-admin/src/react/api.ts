/**
 * Fetch client for the admin API. Every call carries the Clerk session token
 * as a Bearer header — the server authenticates it and swaps it for the
 * user's GitHub OAuth token.
 */

import type { CmsManifest, SaveRequestBody } from "../core/types";

export type ApiClient = ReturnType<typeof createApiClient>;

export type ManifestResponse = {
  manifest: CmsManifest;
  repo: string;
  branch: string;
};

export type ContentResponse = {
  path: string;
  sha: string;
  contentObject: unknown;
};

export type SaveResponse =
  | { status: "success"; commitSha: string; sha: string | null }
  | { status: "conflict" };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const createApiClient = (
  base: string,
  getToken: () => Promise<string | null>
) => {
  const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const token = await getToken();
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string>),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {}

    if (!response.ok) {
      // A 409 save conflict is a result, not an error.
      if (response.status === 409 && data?.status === "conflict") {
        return data as T;
      }
      throw new ApiError(
        data?.message ?? `Request failed (${response.status}).`,
        response.status
      );
    }
    return data as T;
  };

  return {
    getManifest: () => request<ManifestResponse>("/manifest"),
    getContent: (path: string) =>
      request<ContentResponse>(`/content?path=${encodeURIComponent(path)}`),
    saveContent: (body: SaveRequestBody) =>
      request<SaveResponse>("/content", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };
};
