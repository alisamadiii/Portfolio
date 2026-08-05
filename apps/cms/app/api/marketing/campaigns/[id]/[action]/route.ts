import { agency } from "@workspace/trpc/lib/agency";

import { toErrorResponse } from "@/lib/api-error";
import { requireFeatureAccess } from "@/lib/feature-access";
import { requireApiUserSession } from "@/lib/session-server";

/**
 * Campaign lifecycle proxy to the agency Worker. This is the 402 surface:
 * send/test require an active Marketing Emails subscription (the purchase
 * dialog opens client-side on 402); pause/resume/cancel stay ungated so a
 * lapsed subscription can still stop an in-flight campaign.
 *
 * POST /api/marketing/campaigns/[id]/{send|test|pause|resume|cancel}
 *
 * Ownership is enforced by the Worker: it only acts on campaigns whose
 * userId matches the session user we pass along (admin key act-as pattern).
 */

const GATED = ["send", "test"] as const;
const ACTIONS = ["send", "test", "pause", "resume", "cancel"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await context.params;
    if (!ACTIONS.includes(action as Action)) {
      return Response.json(
        { status: "error", message: `Unknown action "${action}".` },
        { status: 404 }
      );
    }

    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    if (GATED.includes(action as (typeof GATED)[number])) {
      try {
        await requireFeatureAccess(user, "marketing");
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 402) {
          // Include the feature so the purchase dialog sells Marketing
          // Emails, not the default CMS plan.
          return Response.json(
            {
              status: "error",
              message: (error as Error).message,
              feature: "marketing",
            },
            { status: 402 }
          );
        }
        throw error;
      }
    }

    const { data, error } = await agency().admin.marketing[action as Action](
      id,
      { userId: user.id }
    );
    if (error) {
      return Response.json(
        { status: "error", message: error.message },
        { status: error.status >= 400 && error.status <= 599 ? error.status : 502 }
      );
    }

    return Response.json({ status: "success", data });
  } catch (error) {
    console.error(error);
    return toErrorResponse(error);
  }
}
