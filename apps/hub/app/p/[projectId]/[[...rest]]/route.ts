import { NextResponse, type NextRequest } from "next/server";

import { createHttpCaller } from "@workspace/trpc/http-caller";

import { isProjectId } from "@/lib/paths";
import { WORKSPACE_COOKIE, WORKSPACE_COOKIE_MAX_AGE } from "@/lib/workspace";

// Legacy /p/<projectId>/<page> links (invite and lead emails, Stripe return
// URLs, Uber Eats / DoorDash / Wix callbacks, old bookmarks). Focus the
// workspace on that project, then open the id-less page with the same query.

const isUnauthorized = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; rest?: string[] }> }
) {
  const { projectId, rest = [] } = await context.params;
  const { origin, pathname, search } = request.nextUrl;
  const home = NextResponse.redirect(new URL("/", origin), 307);
  if (!isProjectId(projectId)) return home;

  const caller = createHttpCaller(request.headers);
  let projects: { projectId: string }[];
  try {
    // A brand-new collaborator arrives here from the invite email, before
    // any (main) layout ran bindInvites for them.
    await caller.cms.collaborators.bindInvites.mutate().catch(() => {});
    projects = await caller.cms.repos.listMine.query();
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    const signIn = new URL("/sign-in", origin);
    signIn.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(signIn, 307);
  }
  if (!projects.some((p) => p.projectId === projectId)) return home;

  const destination = new URL(`/${rest.join("/")}`, origin);
  destination.search = search;
  const response = NextResponse.redirect(destination, 307);
  // Router prefetches hit route handlers too; only a real visit may refocus.
  const prefetch = request.headers.get("next-router-prefetch") || request.headers.get("rsc");
  if (!prefetch) {
    response.cookies.set(WORKSPACE_COOKIE, projectId, {
      path: "/",
      maxAge: WORKSPACE_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
