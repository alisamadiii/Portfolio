"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isProjectId } from "@/lib/paths";
import { safeWorkspacePath, WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from "@/lib/workspace";

const cookieOptions = {
  path: "/",
  maxAge: WORKSPACE_COOKIE_MAX_AGE,
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Focus the workspace on a project and go to `to` (same-origin path). The
 * redirect re-renders the server layouts, so every page picks up the new
 * project without any client cache juggling. Access is enforced where the
 * project is read (listMine + cmsProcedure), not here: a cookie for a project
 * the caller can't see simply falls back to their first project.
 */
export async function selectProject(projectId: string, to = "/") {
  if (!isProjectId(projectId)) redirect("/");
  (await cookies()).set(WORKSPACE_COOKIE, projectId, cookieOptions);
  redirect(safeWorkspacePath(to));
}

/** Forget the focused project (after deleting it); Home picks the next one. */
export async function clearProject(to = "/") {
  (await cookies()).set(WORKSPACE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  redirect(safeWorkspacePath(to));
}
