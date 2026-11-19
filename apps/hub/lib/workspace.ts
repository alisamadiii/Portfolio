import { isProjectId } from "@/lib/paths";

/** Remembers the project the hub is focused on. Read by server layouts, written only by the selectProject action and the /p/* redirect. */
export const WORKSPACE_COOKIE = "hub-project";
export const WORKSPACE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * The project the workspace opens: the cookie's project when the caller can
 * still access it, else the first accessible project (listMine orders by
 * most recently updated), else null (nothing imported yet).
 */
export function pickWorkspaceProject<T extends { projectId: string }>(
  cookieId: string | null | undefined,
  projects: readonly T[]
): T | null {
  if (isProjectId(cookieId)) {
    const match = projects.find((p) => p.projectId === cookieId);
    if (match) return match;
  }
  return projects[0] ?? null;
}

/** A same-origin destination for the selectProject redirect; anything else lands on Home. */
export const safeWorkspacePath = (to: string | null | undefined): string =>
  typeof to === "string" && to.startsWith("/") && !to.startsWith("//") ? to : "/";
