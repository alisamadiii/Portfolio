import { type NextRequest } from "next/server";

import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { assertAdminUser } from "@/lib/authz-shared";
import {
  getMediaProvider,
  isMediaProviderId,
  toPublicMediaConfig,
} from "@/lib/media-providers";
import {
  getMediaSettings,
  getPublicMediaSettings,
  setMediaSettings,
} from "@/lib/repo-settings";
import { requireApiUserSession } from "@/lib/session-server";
import { getToken } from "@/lib/token";

/**
 * Get or set the per-repository media provider settings.
 *
 * GET /api/[owner]/[repo]/media-settings
 * PUT /api/[owner]/[repo]/media-settings   body: { provider, config }
 *
 * Secrets (e.g. the ImageKit private key) are write-only: never returned by
 * GET — only whether they are set — and an empty value on PUT keeps the
 * stored one. No config-cache invalidation is needed: media settings are
 * attached to the config at read time, never persisted with it.
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    assertAdminUser(user, "Only admins can manage media settings.");

    const { token } = await getToken(user, params.owner, params.repo, true);
    if (!token) throw createHttpError("Token not found", 401);

    const { provider, config } = await getPublicMediaSettings(
      params.owner,
      params.repo
    );

    // Tell the UI which secrets are already stored (without their values).
    const { config: fullConfig } = await getMediaSettings(
      params.owner,
      params.repo
    );
    const secretsSet = getMediaProvider(provider)
      .configFields.filter((field) => !field.public && fullConfig[field.key])
      .map((field) => field.key);

    return Response.json({
      status: "success",
      data: { provider, config, secretsSet },
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const params = await context.params;
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    assertAdminUser(user, "Only admins can manage media settings.");

    const { token } = await getToken(user, params.owner, params.repo, true);
    if (!token) throw createHttpError("Token not found", 401);

    const body: any = await request.json().catch(() => ({}));
    if (!isMediaProviderId(body?.provider)) {
      throw createHttpError('"provider" is invalid.', 400);
    }
    const config =
      body?.config && typeof body.config === "object" ? body.config : {};

    const saved = await setMediaSettings(
      params.owner,
      params.repo,
      body.provider,
      config
    );

    return Response.json({
      status: "success",
      message: "Media settings updated.",
      data: {
        provider: saved.provider,
        config: toPublicMediaConfig(saved.provider, saved.config),
      },
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}
