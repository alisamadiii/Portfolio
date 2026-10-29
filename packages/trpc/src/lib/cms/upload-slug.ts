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
