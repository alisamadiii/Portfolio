import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@workspace/auth/auth";
import { sealAccountToken } from "@workspace/auth/tokens";
import { db } from "@workspace/drizzle/pool";
import { hubProject, hubUberProvision, hubUberStore, user } from "@workspace/drizzle/schema";
import { resolveProjectRole } from "@workspace/trpc/lib/cms/project-access";
import {
  activateUberStore,
  bindUberStore,
  exchangeUberCode,
  isUberEatsConfigured,
  listUberStores,
  readUberStore,
} from "@workspace/trpc/lib/uber-eats";
import { storeAddress, verifyUberState } from "@workspace/trpc/lib/uber-eats-shared";
import { urls } from "@workspace/ui/lib/company";

// ─── Uber Eats connect callback ─────────────────────────────────
// Uber's consent screen redirects here with ?code&state. The state says which
// hub project and user started it, and the browser landing here must be
// signed in as that user, so a forwarded link can't bind someone else's
// store to the sender's project. The code becomes the merchant's token, we
// list their stores and either activate the only one right away or keep the
// token (encrypted, 30 min) until the owner picks one in the hub.

type Result = "connected" | "choose" | "nostores" | "taken" | "denied" | "error";

const PROVISION_TTL_MS = 30 * 60_000;

const back = (projectId: string | null, result: Result) =>
  NextResponse.redirect(
    projectId ? `${urls.cms}/p/${projectId}/uber-eats?uber=${result}` : `${urls.cms}/`,
    { status: 302 }
  );

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const state = verifyUberState(params.get("state") ?? "", process.env.BETTER_AUTH_SECRET ?? "");
  if (!state) return back(null, "error");
  if (params.get("error") === "access_denied") return back(state.projectId, "denied");
  const code = params.get("code");
  if (!code || !isUberEatsConfigured()) return back(state.projectId, "error");

  const session = await auth.api.getSession({ headers: await nextHeaders() }).catch(() => null);
  if (!session || session.user.id !== state.userId) return back(state.projectId, "error");

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

    const merchantToken = await exchangeUberCode(code);
    const stores = await listUberStores(merchantToken);
    if (!stores.length) return back(state.projectId, "nostores");

    if (stores.length === 1) {
      const storeId = stores[0]!.store_id;
      const taken = await db.query.hubUberStore.findFirst({ where: eq(hubUberStore.storeId, storeId) });
      if (taken && taken.projectId !== project.id) return back(state.projectId, "taken");
      await activateUberStore(merchantToken, storeId, project.id);
      const { store, status } = await readUberStore(storeId).catch(() => ({ store: stores[0]!, status: null }));
      await bindUberStore(project.id, caller.id, store, status);
      await db.delete(hubUberProvision).where(eq(hubUberProvision.projectId, project.id));
      return back(state.projectId, "connected");
    }

    const values = {
      userId: caller.id,
      tokenEnc: await sealAccountToken(merchantToken),
      stores: stores.map((s) => ({
        storeId: s.store_id,
        name: s.name?.trim() || "Uber Eats store",
        address: storeAddress(s.location),
      })),
      expiresAt: new Date(Date.now() + PROVISION_TTL_MS),
    };
    await db
      .insert(hubUberProvision)
      .values({ projectId: project.id, ...values })
      .onConflictDoUpdate({ target: hubUberProvision.projectId, set: values });
    return back(state.projectId, "choose");
  } catch (error) {
    console.error("Uber Eats connect callback failed", error);
    return back(state.projectId, "error");
  }
}
