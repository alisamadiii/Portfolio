import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/pool";
import { hubProject, user } from "@workspace/drizzle/schema";
import { resolveProjectRole } from "@workspace/trpc/lib/cms/project-access";
import { verifySignedInstance, verifyWixState } from "@workspace/trpc/lib/wix-shared";
import { urls } from "@workspace/ui/lib/company";

// ─── Wix app install callback ───────────────────────────────────
// Wix's installer redirects here after the client installs the hub's Wix app
// on a site: ?state=<ours>&appId&tenantId&instanceId&signedInstance. The
// signed instance (HMAC with the app secret) is the proof of install; the
// state says which hub project and user started it, and the browser landing
// here must be signed in as that user: a forwarded install link can't bind
// someone else's Wix site to the sender's project. Then back to the hub.

// Wix signs the instance right before redirecting here.
const INSTANCE_MAX_AGE_MS = 10 * 60_000;

const back = (projectId: string | null, result: "connected" | "taken" | "error") =>
  NextResponse.redirect(
    projectId ? `${urls.cms}/p/${projectId}/wix?wix=${result}` : `${urls.cms}/`,
    { status: 302 }
  );

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const state = verifyWixState(params.get("state") ?? "", process.env.BETTER_AUTH_SECRET ?? "");
  if (!state) return back(null, "error");

  const session = await auth.api.getSession({ headers: await nextHeaders() }).catch(() => null);
  if (!session || session.user.id !== state.userId) return back(state.projectId, "error");

  const instanceId = params.get("instanceId") ?? "";
  const instance = verifySignedInstance(
    params.get("signedInstance") ?? "",
    process.env.WIX_APP_SECRET ?? "",
    { maxAgeMs: INSTANCE_MAX_AGE_MS }
  );
  if (
    !instance ||
    instance.instanceId !== instanceId ||
    (instance.appDefId && instance.appDefId !== process.env.WIX_APP_ID)
  ) {
    return back(state.projectId, "error");
  }

  try {
    // The user must still have full access to the project.
    const [project] = await db
      .select({ id: hubProject.id, githubConnectedUserId: hubProject.githubConnectedUserId })
      .from(hubProject)
      .where(eq(hubProject.id, state.projectId))
      .limit(1);
    const [caller] = await db
      .select({ id: user.id, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.id, state.userId))
      .limit(1);
    if (!project || !caller) return back(state.projectId, "error");
    const role = await resolveProjectRole(caller, {
      projectId: project.id,
      githubConnectedUserId: project.githubConnectedUserId,
    });
    if (role !== "full-access") return back(state.projectId, "error");

    const [taken] = await db
      .select({ id: hubProject.id })
      .from(hubProject)
      .where(and(eq(hubProject.wixInstanceId, instanceId), ne(hubProject.id, project.id)))
      .limit(1);
    if (taken) return back(state.projectId, "taken");

    await db
      .update(hubProject)
      .set({
        wixInstanceId: instanceId,
        wixSiteId: params.get("tenantId") || null,
        wixConnectedUserId: caller.id,
      })
      .where(eq(hubProject.id, project.id));
    return back(state.projectId, "connected");
  } catch (error) {
    console.error("Wix install callback failed", error);
    return back(state.projectId, "error");
  }
}
