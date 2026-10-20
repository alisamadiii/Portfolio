import crypto from "crypto";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { githubInstallation } from "@workspace/drizzle/schema";
import { bustInstallationForRepo } from "@workspace/trpc/lib/github-app";

export const maxDuration = 60;

// ─── GitHub App webhook ──────────────────────────────────────────
// Lifecycle events for "Ali Samadi App" installations. Rows are upserted on
// install and tombstoned (never deleted) on uninstall/suspend, mirroring
// hubProject.hidden. Repo coverage itself is resolved live (lib/github-app),
// so the only repo-level work here is busting that cache.
//
// POST /api/webhook/github-app

type InstallationPayload = {
  action?: string;
  installation?: {
    id: number;
    account?: {
      id: number;
      login: string;
      type?: string;
    } | null;
    repository_selection?: string;
  };
  sender?: { id: number; login: string } | null;
  repositories?: { full_name: string }[];
  repositories_added?: { full_name: string }[];
  repositories_removed?: { full_name: string }[];
};

const upsertInstallation = async (payload: InstallationPayload) => {
  const installation = payload.installation;
  if (!installation?.id || !installation.account) return;
  const fields = {
    accountLogin: installation.account.login,
    accountId: installation.account.id,
    accountType: installation.account.type ?? "User",
    senderGithubId: payload.sender?.id ?? null,
    senderLogin: payload.sender?.login ?? null,
    repositorySelection: installation.repository_selection ?? "selected",
    suspendedAt: null,
    removedAt: null,
    updatedAt: new Date(),
  };
  await db
    .insert(githubInstallation)
    .values({ installationId: installation.id, ...fields })
    .onConflictDoUpdate({
      target: githubInstallation.installationId,
      set: fields,
    });
};

const markInstallation = async (
  installationId: number,
  set: Partial<{ suspendedAt: Date | null; removedAt: Date | null }>
) => {
  await db
    .update(githubInstallation)
    .set({ ...set, updatedAt: new Date() })
    .where(eq(githubInstallation.installationId, installationId));
};

const bustRepos = (payload: InstallationPayload) => {
  const repos = [
    ...(payload.repositories ?? []),
    ...(payload.repositories_added ?? []),
    ...(payload.repositories_removed ?? []),
  ];
  for (const { full_name } of repos) {
    const [owner, repo] = full_name.split("/");
    if (owner && repo) bustInstallationForRepo(owner, repo);
  }
};

const handleEvent = async (event: string, payload: InstallationPayload) => {
  const installationId = payload.installation?.id;
  if (!installationId) return;

  if (event === "installation") {
    switch (payload.action) {
      case "created":
      case "new_permissions_accepted":
      case "unsuspend":
        await upsertInstallation(payload);
        break;
      case "deleted":
        await markInstallation(installationId, { removedAt: new Date() });
        break;
      case "suspend":
        await markInstallation(installationId, { suspendedAt: new Date() });
        break;
    }
    bustRepos(payload);
    return;
  }

  if (event === "installation_repositories") {
    bustRepos(payload);
  }
};

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-hub-signature-256");
    const event = request.headers.get("x-github-event") ?? "";
    const body = await request.text();

    const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
    if (!secret) {
      console.error("Missing GITHUB_APP_WEBHOOK_SECRET");
      return Response.json(null, { status: 500 });
    }

    if (!signature) {
      return Response.json(null, { status: 401 });
    }

    const digest = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex")}`;
    const signatureBuffer = Buffer.from(signature, "utf8");
    const digestBuffer = Buffer.from(digest, "utf8");
    if (
      signatureBuffer.length !== digestBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
    ) {
      return Response.json(null, { status: 401 });
    }

    const payload = JSON.parse(body) as InstallationPayload;
    await handleEvent(event, payload);

    return Response.json(null, { status: 200 });
  } catch (error) {
    console.error("[github-app webhook] error:", error);
    return Response.json(null, { status: 500 });
  }
}
