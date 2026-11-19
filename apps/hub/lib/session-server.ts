import { cache } from "react";
import { cookies, headers } from "next/headers";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { pickWorkspaceProject, WORKSPACE_COOKIE } from "@/lib/workspace";

// tRPC's authenticatedProcedure throws UNAUTHORIZED (never null) when signed out.
const isUnauthorized = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED";

// Session lives in the portfolio backend (which owns Better Auth + the secret).
// Resolve it over tRPC HTTP with the browser cookie forwarded, so CMS needs no
// BETTER_AUTH_SECRET of its own. Mirrors apps/admin.
const resolveUserFromHeaders = async (requestHeaders: Headers) => {
  try {
    return await createHttpCaller(requestHeaders).users.getSession.query();
  } catch (error) {
    if (isUnauthorized(error)) return null;
    throw error;
  }
};

const getServerUser = cache(async () => resolveUserFromHeaders(await headers()));

const getServerSession = cache(async () => {
  const user = await getServerUser();
  return user ? { user } : null;
});

/** Every project the caller can open (cms.repos.listMine), once per request. */
const getServerProjects = cache(async () =>
  createHttpCaller(await headers()).cms.repos.listMine.query()
);

/** The project the workspace is focused on: the cookie's, else the first, else null. */
const getWorkspaceProject = cache(async () => {
  const [projects, cookieStore] = await Promise.all([getServerProjects(), cookies()]);
  return pickWorkspaceProject(cookieStore.get(WORKSPACE_COOKIE)?.value, projects);
});

const requireApiUserSession = async () => {
  const user = await getServerUser();
  if (!user) {
    return { response: new Response(null, { status: 401 }) };
  }

  return { user };
};

export {
  getServerUser,
  getServerSession,
  getServerProjects,
  getWorkspaceProject,
  requireApiUserSession,
  resolveUserFromHeaders,
};
