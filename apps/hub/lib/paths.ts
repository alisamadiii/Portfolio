/** A project id: hub_project.id, a uuid. */
export const PROJECT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isProjectId = (value: unknown): value is string =>
  typeof value === "string" && PROJECT_ID_RE.test(value);

/**
 * A hub page of the focused project: appPath("leads", id) → "/leads/<id>",
 * appPath() → "/". The project never appears in the URL; the workspace cookie
 * (lib/workspace.ts) says which one every page is about.
 */
export const appPath = (...segments: string[]) => `/${segments.filter(Boolean).join("/")}`;

/**
 * A link that FOCUSES another project before opening a page (emails, the Sites
 * table, other projects' sessions). app/p/[projectId]/[[...rest]]/route.ts sets
 * the workspace cookie and redirects to the id-less page.
 */
export const projectLink = (projectId: string, ...segments: string[]) =>
  ["", "p", projectId, ...segments].join("/");
