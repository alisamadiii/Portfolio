import { headers } from "next/headers";
import { createHttpCaller } from "@workspace/trpc/http-caller";
import { isAdminUser } from "@/lib/authz-shared";
import { toErrorResponse } from "@/lib/api-error";
import { requireApiUserSession } from "@/lib/session-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Re-syncs the org repo table from GitHub via the portfolio API.
 *
 * POST /api/repos/sync
 *
 * Requires an admin.
 */

export async function POST() {
  try {
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;

    if (!isAdminUser(sessionResult.user)) {
      return Response.json(
        { status: "error", message: "Forbidden" },
        { status: 403 }
      );
    }

    const caller = createHttpCaller(await headers());
    const result = await caller.cms.syncRepos.mutate();

    return Response.json({
      status: "success",
      data: result,
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}
