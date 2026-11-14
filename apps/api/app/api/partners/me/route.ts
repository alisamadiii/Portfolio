import { eq, or } from "drizzle-orm";
import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { partner } from "@workspace/drizzle/schema";

import { partnerCors } from "../cors";

// Who is applying on partners.alisamadii.com: the signed-in Client Hub
// account (for the sign-in gate and prefill) and whether it already applied.

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: partnerCors(req, "GET") });
}

export async function GET(req: Request) {
  const headers = { ...partnerCors(req, "GET"), "Cache-Control": "no-store" };
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!session) return NextResponse.json({ user: null, partner: null }, { headers });

  const [row] = await db
    .select({ status: partner.status, createdAt: partner.createdAt })
    .from(partner)
    .where(
      or(
        eq(partner.userId, session.user.id),
        eq(partner.email, session.user.email.toLowerCase())
      )
    )
    .limit(1);

  return NextResponse.json(
    {
      user: { name: session.user.name ?? "", email: session.user.email },
      partner: row ?? null,
    },
    { headers }
  );
}
