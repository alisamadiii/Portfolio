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
};
