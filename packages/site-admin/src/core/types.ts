/**
 * Local copies of the cms-bridge v2 contract types (cms.json manifest shapes).
 * cms-bridge does not export these from its public entrypoints, so they are
 * duplicated here — keep in sync with
 * packages/cms-bridge/src/cli/core/manifest.ts.
 */

export type CollectionField = {
  name: string;
  type: string;
  label?: string;
  required?: boolean;
  options?: string[];
  /** Image fields only: opt into the multi-image gallery widget (value is string[]). */
  multiple?: boolean | { max?: number };
};

export type CollectionDef = {
  name: string;
  label?: string;
  path: string;
  route?: string;
  fields: CollectionField[];
};

export type CmsManifest = {
  version: 1;
  baseUrl: string;
  media?: { input: string; output: string };
  pages: Record<string, { route: string; title?: string }>;
  collections: CollectionDef[];
};

/** Server-side configuration for the admin API handler. */
export type AdminConfig = {
  /** Clerk secret key (server-only). */
  clerkSecretKey: string;
  /** Clerk publishable key — required by Clerk request authentication. */
  clerkPublishableKey: string;
  /** GitHub repository, "owner/name". */
  repo: string;
  /** Branch to read from and commit to. Defaults to the repo's default branch. */
  branch?: string;
  /** Pathname prefix the handler is mounted under. Default "/api/admin". */
  basePath?: string;
};

export type AdminContent = {
  path: string;
  sha: string;
  contentObject: unknown;
};

export type SaveRequestBody = {
  path: string;
  /** Base blob sha the edit started from; null when creating a new file. */
  sha: string | null;
  contentObject: unknown;
  message?: string;
  /** Set after a conflict to overwrite what changed on GitHub. */
  force?: boolean;
};
