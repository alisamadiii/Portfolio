/** A project id: hub_project.id, a uuid. */
export const PROJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isProjectId = (value: unknown): value is string =>
  typeof value === "string" && PROJECT_ID_RE.test(value);

/** Internal hub route base for a project, keyed by its uuid (hub_project.id).
 *  Owner + branch are resolved server-side and never appear in the URL. */
export const repoPath = (projectId: string, ...segments: string[]) =>
  ["", "p", projectId, ...segments].join("/");

/** A /p/[projectId] pathname without its project prefix ("/p/<id>/marketing" → "/marketing", "/p/<id>" → "/"). */
export const projectSubpath = (pathname: string) =>
  pathname.replace(/^\/p\/[0-9a-f-]{36}/i, "") || "/";

/** An agency page under its project: ("/agency/booking") → "/p/<id>/agency/booking", "/" → "/p/<id>". */
export const agencyHref = (projectId: string, path: string) =>
  repoPath(projectId) + (path === "/" ? "" : path);
