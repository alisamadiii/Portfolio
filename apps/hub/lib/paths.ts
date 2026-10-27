/** Internal hub route base for a repo, keyed by the GitHub-stable numeric repoId
 *  (globally unique, unlike the repo name). Owner + branch are resolved
 *  server-side and never appear in the URL. */
export const repoPath = (repoId: number, ...segments: string[]) =>
  ["", "p", String(repoId), ...segments].join("/");

/** A /p/[repoId] pathname without its project prefix ("/p/1/marketing" → "/marketing", "/p/1" → "/"). */
export const projectSubpath = (pathname: string) =>
  pathname.replace(/^\/p\/\d+/, "") || "/";

/** An agency page under its project: ("/agency/booking") → "/p/<id>/agency/booking", "/" → "/p/<id>". */
export const agencyHref = (repoId: number, path: string) =>
  repoPath(repoId) + (path === "/" ? "" : path);
