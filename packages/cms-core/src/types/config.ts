import type { MediaProviderId } from "@workspace/drizzle/schema";

export type Config = {
  owner: string;
  repo: string;
  branch: string;
  sha: string;
  version: string;
  object: Record<string, any>;
  lastCheckedAt?: Date;
  /**
   * Per-repo media provider settings (public config only — secrets stripped).
   * Attached dynamically by `getConfig`, never persisted with the cached config.
   */
  mediaSettings?: {
    provider: MediaProviderId;
    config: Record<string, string>;
  };
};
