/**
 * Media provider registry.
 *
 * Where a repo's media lives and how the CMS talks to it. The enum in the
 * shared Drizzle schema (`mediaProviderValues`) is the source of truth for
 * provider ids; every enum value must have an entry here.
 *
 * ImageKit integration is the official Media Library Widget embed: users sign
 * in to their own ImageKit account inside the CMS and pick assets there — no
 * API keys stored, selection returns absolute CDN URLs.
 *
 * Adding a provider:
 * 1. Append its id to `mediaProviderValues` in `@workspace/drizzle/schema`
 *    and run db:push.
 * 2. Add its registry entry below (label + config fields, if any).
 * 3. Wire its picker UI where `imagekit` is dispatched (fields + media page).
 *
 * This module is pure data — safe to import from client components.
 */

import {
  mediaProviderValues,
  type MediaProviderId,
} from "@workspace/drizzle/schema";

export type MediaProviderConfigField = {
  key: string;
  label: string;
  type: "text" | "password";
  /** Whether the value may be sent to the browser. Secrets are `false`. */
  public: boolean;
  required: boolean;
  placeholder?: string;
  description?: string;
};

export type MediaProviderDef = {
  id: MediaProviderId;
  label: string;
  /**
   * `true` when media is committed into the repository itself (GitHub flow:
   * Upload / Select / Link buttons, `.pages.yml` media config required).
   * `false` for hosted services browsed via the media-provider proxy.
   */
  supportsRepoUpload: boolean;
  configFields: MediaProviderConfigField[];
};

const MEDIA_PROVIDERS: Record<MediaProviderId, MediaProviderDef> = {
  github: {
    id: "github",
    label: "GitHub repository",
    supportsRepoUpload: true,
    configFields: [],
  },
  imagekit: {
    id: "imagekit",
    label: "ImageKit",
    supportsRepoUpload: false,
    // No config needed: the embedded Media Library Widget authenticates with
    // the user's own ImageKit login.
    configFields: [],
  },
};

const DEFAULT_MEDIA_PROVIDER: MediaProviderId = "github";

const isMediaProviderId = (value: unknown): value is MediaProviderId =>
  typeof value === "string" &&
  (mediaProviderValues as readonly string[]).includes(value);

const getMediaProvider = (id: MediaProviderId): MediaProviderDef =>
  MEDIA_PROVIDERS[id];

/** Strip non-public config (secrets) before anything reaches the client. */
const toPublicMediaConfig = (
  providerId: MediaProviderId,
  config: Record<string, string> | null | undefined
): Record<string, string> => {
  if (!config) return {};
  const publicKeys = new Set(
    MEDIA_PROVIDERS[providerId].configFields
      .filter((field) => field.public)
      .map((field) => field.key)
  );
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => publicKeys.has(key))
  );
};

export {
  MEDIA_PROVIDERS,
  DEFAULT_MEDIA_PROVIDER,
  isMediaProviderId,
  getMediaProvider,
  toPublicMediaConfig,
};
export { mediaProviderValues, type MediaProviderId };
