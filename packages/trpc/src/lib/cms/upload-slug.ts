import { randomInt } from "crypto";

/**
 * Pure helpers for the upload import flow (deploy.importUpload). Split out of
 * the router so they are unit-testable without a DB.
 */

/** Slug for the project's display name ('uploads/<slug>' hub row). */
export const uploadSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\.zip$/, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "site";

// Floor well above GitHub's repo-id range (int32, < 2.15e9) so a synthetic id
// can never collide with a real repository id. Still a safe JS integer.
export const SYNTHETIC_REPO_ID_FLOOR = 1_000_000_000_000;

/** A random synthetic repoId for an uploaded (no-GitHub) project. */
export const syntheticRepoId = (): number =>
  SYNTHETIC_REPO_ID_FLOOR + randomInt(2 ** 40);
