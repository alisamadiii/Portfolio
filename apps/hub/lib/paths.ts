/** Internal hub route base for a repo, keyed by the GitHub-stable numeric repoId
 *  (globally unique, unlike the repo name). Owner + branch are resolved
 *  server-side and never appear in the URL. */
export const repoPath = (repoId: number, ...segments: string[]) =>
  ["", "p", String(repoId), ...segments].join("/");
