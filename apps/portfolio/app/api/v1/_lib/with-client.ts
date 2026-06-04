import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getIp, isRateLimited } from "@workspace/trpc/middleware/rate-limit";
import { db } from "@workspace/drizzle/index";
import {
  activityLog,
  agencyClient,
  user,
  type ActivityLogInsert,
} from "@workspace/drizzle/schema";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export type Client = {
  id: string;
  userId: string;
  status: string;
  contactEmail: string | null;
  apiKeyOrigin: string | null;
  name: string;
  userEmail: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

type HandlerContext = {
  req: NextRequest;
  client: Client;
  body: Record<string, unknown>;
  ip: string;
};

type HandlerFn = (ctx: HandlerContext) => Promise<NextResponse>;

export function withClient(handler: HandlerFn) {
  return async (req: NextRequest) => {
    let client: Client | null = null;
    let body: Record<string, unknown> = {};

    try {
      // Parse body
      try {
        body = await req.json();
      } catch {
        throw new ApiError("Please send valid JSON.", 400);
      }

      const token = body.token as string | undefined;
      if (!token) {
        throw new ApiError("Token is required.", 400);
      }

      // Auth
      const [record] = await db
        .select({
          id: agencyClient.id,
          userId: agencyClient.userId,
          status: agencyClient.status,
          contactEmail: agencyClient.contactEmail,
          apiKeyOrigin: agencyClient.apiKeyOrigin,
          name: user.name,
          userEmail: user.email,
        })
        .from(agencyClient)
        .innerJoin(user, eq(user.id, agencyClient.userId))
        .where(eq(agencyClient.apiKey, token))
        .limit(1);

      if (!record) {
        throw new ApiError("Invalid token.", 401);
      }

      client = record;

      if (client.status !== "active") {
        throw new ApiError("Account is not active.", 403);
      }

      // Origin check
      if (client.apiKeyOrigin) {
        const origin = req.headers.get("origin") || req.headers.get("referer");
        if (!origin) {
          throw new ApiError("Could not determine request origin.", 403);
        }

        let originHost: string;
        try {
          originHost = new URL(origin).host.toLowerCase().replace(/^www\./, "");
        } catch {
          throw new ApiError("Invalid origin.", 403);
        }

        const allowed = client.apiKeyOrigin.toLowerCase().replace(/^www\./, "");
        if (originHost !== allowed && originHost.split(":")[0] !== allowed) {
          throw new ApiError(
            `Origin not allowed: ${originHost} (expected: ${allowed})`,
            403
          );
        }
      }

      // Rate limit
      const ip = (await getIp()) || "unknown";
      if (isRateLimited(ip, 3)) {
        throw new ApiError("Too many requests. Try again in a minute.", 429);
      }

      // Run handler
      return await handler({ req, client, body, ip });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      const status = err instanceof ApiError ? err.status : 500;

      // Log error if we have a client
      if (client) {
        db.insert(activityLog)
          .values({
            type: "contact",
            status: "failed",
            userId: client.userId,
            actor: (body.email as string) || undefined,
            summary: body.name
              ? `Contact form: ${body.name} — ${body.subject ?? "N/A"}`
              : "Contact form: invalid request",
            metadata: {
              name: String(body.name ?? ""),
              email: String(body.email ?? ""),
              subject: String(body.subject ?? ""),
              message: String(body.message ?? ""),
              sourceUrl: (body.sourceUrl as string) ?? null,
            },
            error: message,
          } satisfies ActivityLogInsert<"contact">)
          .then(() => {});
      }

      if (status !== 500) {
        return NextResponse.json(
          { error: message },
          { status, headers: corsHeaders }
        );
      }

      console.error("[v1]", err);
      return NextResponse.json(
        { error: "Something went wrong on our end. Please try again later." },
        { status: 500, headers: corsHeaders }
      );
    }
  };
}

export function logSuccess(
  client: Client,
  body: Record<string, unknown>,
  error?: string
) {
  db.insert(activityLog)
    .values({
      type: "contact",
      status: "success",
      userId: client.userId,
      actor: body.email as string,
      summary: `Contact form: ${body.name} — ${body.subject}`,
      metadata: {
        name: String(body.name),
        email: String(body.email),
        subject: String(body.subject),
        message: String(body.message),
        sourceUrl: (body.sourceUrl as string) ?? null,
        ...(body.metadata
          ? { metadata: body.metadata as Record<string, unknown> }
          : {}),
      },
    } satisfies ActivityLogInsert<"contact">)
    .then(() => {});
}
