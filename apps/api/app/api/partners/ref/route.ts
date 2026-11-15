import { NextResponse } from "next/server";
import { z } from "zod";

import { findApprovedPartnerByCode } from "@workspace/trpc/lib/partners";
import {
  PARTNER_REF_COOKIE,
  PARTNER_REF_MAX_AGE,
} from "@workspace/trpc/lib/partners-shared";

import { partnerCors } from "../cors";

import { clientIp, isRateLimited } from "@/lib/agency-public";

// ─── Partner link check ──────────────────────────────────────────
// www.alisamadii.com/?ref=CODE posts the code here (credentials: include).
// A code of an approved partner is stored in a 30-day cookie on
// .alisamadii.com, read later at Client Hub sign-up / sign-in
// (packages/auth). Unknown codes change nothing.

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: partnerCors(req, "POST") });
}

const RATE_LIMIT = 30; // per IP per 10 minutes (shared Postgres window)

const bodySchema = z.object({ code: z.string().trim().min(1).max(60) });

export async function POST(req: Request) {
  const headers = partnerCors(req, "POST");
  // JSON only: a cross-site form can't send it without a CORS preflight, so
  // another page can't set the referral cookie behind the visitor's back.
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ valid: false }, { status: 415, headers });
  }
  const ip = clientIp(req);
  if (await isRateLimited(`partner-ref:${ip}`, RATE_LIMIT)) {
    return NextResponse.json({ valid: false }, { status: 429, headers });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false }, { headers });

  const found = await findApprovedPartnerByCode(parsed.data.code).catch((err) => {
    console.error("[partners/ref] lookup failed", err);
    return null;
  });
  if (!found?.code) return NextResponse.json({ valid: false }, { headers });

  // First name only, for the "Referred by" note on the site.
  const partnerName = found.fullName.trim().split(/\s+/)[0] ?? "";
  const res = NextResponse.json({ valid: true, code: found.code, partnerName }, { headers });
  const prod = process.env.NODE_ENV === "production";
  res.cookies.set(PARTNER_REF_COOKIE, found.code, {
    // Shared with every subdomain (Client Hub, api, partners) in prod.
    domain: prod ? "alisamadii.com" : undefined,
    path: "/",
    maxAge: PARTNER_REF_MAX_AGE,
    httpOnly: true,
    secure: prod,
    sameSite: "lax",
  });
  return res;
}
