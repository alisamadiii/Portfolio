import type { MediaProviderId } from "@workspace/drizzle/schema";

export type Config = {
  owner: string;
  repo: string;
  /**
   * GitHub-stable numeric repo id — the unique key that drives the /p/<repoId>
   * URL. Always set on the hub canvas config (populated by the [repoId] layout);
   * optional because the server-side CMS engine is keyed by
   * (owner, repo, branch) and never builds project URLs.
   */
  repoId?: number;
  branch: string;
  sha: string;
  version: string;
  object: Record<string, any>;
  lastCheckedAt?: Date;
  /**
   * Per-repo media provider settings (public config only — secrets stripped).
   * Attached dynamically at read time, never persisted with the cached config.
   */
  mediaSettings?: {
    // ImageKit is the only provider today. Kept wide (not the narrowed
    // `MediaProviderId` union) so the legacy `provider !== "github"` guards in
    // field/nav/media consumers remain valid dead code until that path is
    // fully removed.
    provider: MediaProviderId | (string & {});
    config: Record<string, string>;
  };
};
