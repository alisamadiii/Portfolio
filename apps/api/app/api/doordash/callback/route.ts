import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { sealAccountToken } from "@workspace/auth/tokens";
import { db } from "@workspace/drizzle/pool";
import { hubDoorDashProvision, hubProject, user } from "@workspace/drizzle/schema";
import { resolveProjectRole } from "@workspace/trpc/lib/cms/project-access";
import {
  DoorDashApiError,
  bindDoorDashStore,
  doordashStoreFor,
  exchangeDoorDashCode,
  isDoorDashConfigured,
  listStoreCandidates,
  startStoreOnboarding,
} from "@workspace/trpc/lib/doordash";
import { verifyDoorDashState } from "@workspace/trpc/lib/doordash-shared";
import { urls } from "@workspace/ui/lib/company";

// ─── DoorDash connect callback ──────────────────────────────────
// DoorDash's sign-in screen redirects here with ?code&state. The state says
// which hub project and user started it, and the browser landing here must be
// signed in as that user, so a forwarded link can't bind someone else's store
// to the sender's project. The code becomes the merchant's one-hour token; we
// list their stores and keep the token (encrypted, 30 min) until the owner
// picks one in the hub. With state.restart the store is already picked: we
// post a fresh onboarding request right away.

type Result = "choose" | "nostores" | "notadmin" | "restarted" | "busy" | "denied" | "error";

const PROVISION_TTL_MS = 30 * 60_000;

const back = (projectId: string | null, result: Result) =>
  NextResponse.redirect(
    projectId ? `${urls.cms}/p/${projectId}/doordash?doordash=${result}` : `${urls.cms}/`,
    { status: 302 }
  );

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const state = verifyDoorDashState(params.get("state") ?? "", process.env.BETTER_AUTH_SECRET ?? "");
  if (!state) return back(null, "error");
  if (params.get("error")) return back(state.projectId, "denied");
  const code = params.get("code");
  if (!code || !isDoorDashConfigured()) return back(state.projectId, "error");

  const session = await auth.api.getSession({ headers: await nextHeaders() }).catch(() => null);
  if (!session || session.user.id !== state.userId) return back(state.projectId, "error");

  try {
    // The user must still have full access to the project.
    const [project] = await db
      .select({
        id: hubProject.id,
        name: hubProject.name,
        address: hubProject.address,
        githubConnectedUserId: hubProject.githubConnectedUserId,
      })
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

    const merchantToken = await exchangeDoorDashCode(code);

    if (state.restart) {
      const store = await doordashStoreFor(project.id);
      if (!store) return back(state.projectId, "error");
      try {
        const onboardingId = await startStoreOnboarding(merchantToken, {
          storeId: store.storeId,
          locationId: project.id,
          name: project.name?.trim() || store.name,
          address: project.address?.trim() || store.address,
          email: store.decisionMakerEmail,
        });
        await bindDoorDashStore(
          project.id,
          caller.id,
          {
            storeId: store.storeId,
            name: store.name,
            address: store.address,
            eligible: true,
            businessId: store.businessId,
            businessName: store.businessName,
          },
          onboardingId,
          store.decisionMakerEmail
        );
      } catch (error) {
        if (error instanceof DoorDashApiError && error.status === 412) return back(state.projectId, "busy");
        throw error;
      }
      return back(state.projectId, "restarted");
    }

    let stores;
    try {
      stores = await listStoreCandidates(merchantToken);
    } catch (error) {
      if (error instanceof DoorDashApiError && error.status === 412) return back(state.projectId, "notadmin");
      throw error;
    }
    if (!stores.length) return back(state.projectId, "nostores");

    const values = {
      userId: caller.id,
      tokenEnc: await sealAccountToken(merchantToken),
      stores,
      expiresAt: new Date(Date.now() + PROVISION_TTL_MS),
    };
    await db
      .insert(hubDoorDashProvision)
      .values({ projectId: project.id, ...values })
      .onConflictDoUpdate({ target: hubDoorDashProvision.projectId, set: values });
    return back(state.projectId, "choose");
  } catch (error) {
    console.error("DoorDash connect callback failed", error);
    return back(state.projectId, "error");
  }
}
