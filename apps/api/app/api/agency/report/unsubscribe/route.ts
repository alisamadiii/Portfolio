import { NextResponse, type NextRequest } from "next/server";

import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import { agencyClient } from "@workspace/drizzle/schema";

import { verifyToken } from "../../newsletter/lib";

const page = (title: string, body: string) =>
  new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;max-width:420px;margin:80px auto;padding:0 16px;color:#111}p{color:#6b7280}</style></head><body><h1>${title}</h1><p>${body}</p></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

/** Signed, never-expiring link from the weekly report email's footer. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const payload = verifyToken(token);
  const clientId = payload?.startsWith("report:")
    ? Number(payload.slice("report:".length))
    : null;
  if (!clientId || !Number.isInteger(clientId)) {
    return page("Link not valid", "This unsubscribe link is broken or was changed. Reply to the report email instead and we'll turn it off for you.");
  }

  await db
    .update(agencyClient)
    .set({ weeklyReport: false })
    .where(eq(agencyClient.id, clientId));

  return page(
    "You're unsubscribed",
    "The weekly report email is off for your account. Your dashboard keeps all the same numbers, and we can turn the email back on any time you ask."
  );
}
