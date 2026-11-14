import { randomBytes } from "node:crypto";

import { eq, or } from "drizzle-orm";
import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@workspace/auth/auth";
import { db } from "@workspace/drizzle/index";
import { partner } from "@workspace/drizzle/schema";
import {
  agreementKey,
  agreementUrl,
  partnerAdminUrl,
  sendPartnerApplicationAlert,
} from "@workspace/trpc/lib/partners";
import { putPrivateObject } from "@workspace/trpc/lib/r2";
import { renderPartnerAgreement } from "@workspace/ui/pdfs/partner-agreement";

import { partnerCors } from "../cors";

// ─── Partner Program application ─────────────────────────────────
// Form on partners.alisamadii.com. Applicants must be signed in to Client
// Hub (shared .alisamadii.com cookie): the application is tied to that
// account and its email. Saves the application, renders the signed
// agreement PDF once into the private R2 bucket, emails Ali.

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: partnerCors(req, "POST") });
}

// In-memory per-IP limit: best effort per instance.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
};

const text = (max: number) => z.string().trim().min(1).max(max);
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

const bodySchema = z.object({
  fullName: text(120),
  phone: z.string().trim().max(40).nullish(),
  // Optional step: blank becomes null.
  occupation: optional(200),
  city: optional(120),
  knowOwners: optional(3000),
  whyJoin: optional(3000),
  agreement: z.object({
    version: text(40),
    accepted: z.literal(true),
    signature: text(120),
    initials: text(6),
    signedAt: z.iso.datetime(),
  }),
  // Honeypot: real people never fill it.
  hp: z.string().optional(),
});

export async function POST(req: Request) {
  const headers = partnerCors(req, "POST");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  if (isRateLimited(ip ?? "unknown")) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const data = parsed.data;
  if (data.hp) return NextResponse.json({ ok: true }, { headers });

  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!session) {
    return NextResponse.json(
      { error: "Please sign in to apply." },
      { status: 401, headers }
    );
  }

  // Same rule as the form: the typed signature is the applicant's full name.
  const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  if (norm(data.agreement.signature) !== norm(data.fullName)) {
    return NextResponse.json(
      { error: "Your signature must match your full name." },
      { status: 400, headers }
    );
  }

  const userId = session.user.id;
  const email = session.user.email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: partner.id, status: partner.status })
    .from(partner)
    .where(or(eq(partner.userId, userId), eq(partner.email, email)))
    .limit(1);
  if (existing && existing.status !== "pending") {
    return NextResponse.json(
      { error: "You've already applied with this account. Reply to our email if anything changed." },
      { status: 409, headers }
    );
  }

  const signedAt = new Date(data.agreement.signedAt);
  const pdfToken = randomBytes(24).toString("base64url");
  const fields = {
    userId,
    fullName: data.fullName,
    email,
    phone: data.phone?.trim() || null,
    occupation: data.occupation,
    city: data.city,
    knowOwners: data.knowOwners,
    whyJoin: data.whyJoin,
    agreementVersion: data.agreement.version,
    signature: data.agreement.signature,
    initials: data.agreement.initials,
    signedAt,
    signedIp: ip,
    userAgent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    pdfToken,
    agreementKey: null,
  };

  // A pending applicant re-applying replaces their application and signature.
  const [row] = existing
    ? await db.update(partner).set(fields).where(eq(partner.id, existing.id)).returning({ id: partner.id })
    : await db.insert(partner).values(fields).returning({ id: partner.id });
  if (!row) {
    return NextResponse.json({ error: "Couldn't save your application." }, { status: 500, headers });
  }

  // The PDF is the record of what was signed. If storage fails the
  // application still counts; admin can regenerate the file.
  let pdfUrl: string | undefined;
  try {
    const pdf = await renderPartnerAgreement({
      fullName: fields.fullName,
      email,
      signature: fields.signature,
      initials: fields.initials,
      signedAt,
      version: fields.agreementVersion,
      ip,
    });
    const key = agreementKey(row.id, pdfToken);
    await putPrivateObject(key, new Uint8Array(pdf), "application/pdf");
    await db.update(partner).set({ agreementKey: key }).where(eq(partner.id, row.id));
    pdfUrl = agreementUrl(pdfToken);
  } catch (err) {
    console.error("[partners/apply] agreement pdf failed", err);
  }

  await sendPartnerApplicationAlert(fields, partnerAdminUrl(row.id)).catch((err) =>
    console.error("[partners/apply] alert email failed", err)
  );

  return NextResponse.json({ id: row.id, pdfUrl }, { headers });
}
