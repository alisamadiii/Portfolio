/** Internal hub route base for a repo. Owner + branch are resolved server-side
 *  and no longer appear in the URL. */
export const repoPath = (repo: string, ...segments: string[]) =>
  ["", "p", repo, ...segments].join("/");
