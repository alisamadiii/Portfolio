import { toErrorResponse } from "@/lib/api-error";
import { refreshFeatureAccess } from "@/lib/feature-access";
import { requireApiUserSession } from "@/lib/session-server";
import { featureKeys, type FeatureKey } from "@workspace/trpc/lib/features";

/**
 * Fresh (uncached) subscription check for a gated feature. Called after the
 * user reports a purchase — busts the backend's cached Stripe data so the
 * next save attempt sees the new subscription immediately.
 *
 * POST /api/subscription/[feature]/refresh
 *
 * Requires authentication.
 */

export async function POST(
  _request: Request,
  context: { params: Promise<{ feature: string }> }
) {
  try {
    const { feature } = await context.params;
    if (!featureKeys.includes(feature as FeatureKey)) {
      return Response.json(
        { status: "error", message: `Unknown feature "${feature}".` },
        { status: 400 }
      );
    }

    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;

    const hasAccess = await refreshFeatureAccess(
      sessionResult.user,
      feature as FeatureKey
    );

    return Response.json({ status: "success", data: { hasAccess } });
  } catch (error) {
    console.error(error);
    return toErrorResponse(error);
  }
}
