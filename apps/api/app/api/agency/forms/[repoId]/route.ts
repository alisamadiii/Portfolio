import { after, NextResponse } from "next/server";
import { and, count, eq, gte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/pool";
import { agencyLead, type AgencyLeadUtm } from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email/usesend";
import {
  FORM_HOURLY_LIMIT,
  MAX_BODY_BYTES,
  MAX_FIELDS,
  isEmail,
  stripUrl,
  tooFast,
} from "@workspace/trpc/lib/agency/lead-capture";
import { CHANNEL_LABELS, classifyLead } from "@workspace/trpc/lib/agency/lead-channel";
import { reportLeadStage } from "@workspace/trpc/lib/agency/conversion-uploads";
import { urls } from "@workspace/ui/lib/company";

import {
  attributionSchema,
  clientIp,
  corsHeaders,
  findClientByRepoId,
  hostOf,
  isAllowedOrigin,
  isRateLimited,
  leadEmailHtml,
  parseRepoIdParam,
} from "@/lib/agency-public";

// ─── Agency lead capture ────────────────────────────────────────
// Public endpoint behind the capture script (public/f.js) on agency clients'
// websites. Saves the submission as an agency_lead, with the ad click IDs
// and UTMs the script kept in its cookie, and emails the client.
//
// f.js posts JSON as text/plain, a "simple" CORS request with no preflight.
// The Origin header is still checked against the client's own domains.

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

// ─── Payload ────────────────────────────────────────────────────

const short = z.string().max(500).optional();

const bodySchema = attributionSchema.extend({
  fields: z
    .record(z.string().max(100), z.string().max(5000))
    .refine((fields) => Object.keys(fields).length <= MAX_FIELDS, "Too many fields"),
  formName: short,
});

// Common field names, matched case-insensitively against the form's inputs.
const NAME_KEYS = ["name", "full_name", "fullname", "your-name", "your_name"];
const EMAIL_KEYS = ["email", "e-mail", "email_address", "your-email", "your_email"];
const PHONE_KEYS = ["phone", "tel", "telephone", "phone_number", "mobile", "your-phone"];
const MESSAGE_KEYS = ["message", "comments", "comment", "details", "description", "your-message"];

function splitFields(fields: Record<string, string>) {
  const rest: Record<string, string> = {};
  const picked: { name?: string; email?: string; phone?: string; message?: string } = {};

  for (const [key, raw] of Object.entries(fields)) {
    const value = raw.trim();
    if (!value) continue;
    const k = key.toLowerCase();
    if (!picked.name && NAME_KEYS.includes(k)) picked.name = value;
    else if (!picked.email && EMAIL_KEYS.includes(k) && isEmail(value)) picked.email = value;
    else if (!picked.phone && PHONE_KEYS.includes(k)) picked.phone = value;
    else if (!picked.message && MESSAGE_KEYS.includes(k)) picked.message = value;
    else rest[key] = value;
  }

  // "first_name" + "last_name" forms.
  if (!picked.name) {
    const first = Object.entries(rest).find(([k]) => /^first[_-]?name$/i.test(k));
    const last = Object.entries(rest).find(([k]) => /^last[_-]?name$/i.test(k));
    if (first || last) {
      picked.name = [first?.[1], last?.[1]].filter(Boolean).join(" ");
      if (first) delete rest[first[0]];
      if (last) delete rest[last[0]];
    }
  }

  return { ...picked, rest };
}

const looksLikeSpam = (text: string) =>
  (text.match(/https?:\/\//g) ?? []).length > 3;

// ─── Handler ────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ repoId: string }> }
) {
  const { repoId: repoIdParam } = await params;
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const repoId = parseRepoIdParam(repoIdParam);
  if (repoId === null) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404, headers });
  }

  const client = await findClientByRepoId(repoId);
  if (!client) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404, headers });
  }
  if (!isAllowedOrigin(origin, client)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Submission too large" }, { status: 413, headers });
  }

  if (await isRateLimited(`form:${repoId}:${clientIp(req)}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers }
    );
  }

  // text/plain body (no preflight), parsed as JSON. Length is checked again
  // since content-length can be missing (chunked).
  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Submission too large" }, { status: 413, headers });
  }
  const parsed = bodySchema.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })()
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const data = parsed.data;
  const { name, email, phone, message, rest } = splitFields(data.fields);

  if (!name && !email && !phone && !message && !Object.keys(rest).length) {
    return NextResponse.json({ error: "Empty submission" }, { status: 400, headers });
  }

  // A burst on one form (bots rotating IPs) is saved without emailing anyone.
  const [recent] = await db
    .select({ n: count() })
    .from(agencyLead)
    .where(
      and(
        eq(agencyLead.repoId, client.repoId),
        gte(agencyLead.createdAt, new Date(Date.now() - 60 * 60 * 1000))
      )
    );

  // Spam is kept (status "spam") so a false positive can still be recovered.
  const isSpam =
    Boolean(data.hp) ||
    tooFast(data.t) ||
    (recent?.n ?? 0) >= FORM_HOURLY_LIMIT ||
    looksLikeSpam(`${message ?? ""} ${Object.values(rest).join(" ")}`);
  const referrer = stripUrl(data.referrer);
  const utm: AgencyLeadUtm | null =
    data.utm && Object.values(data.utm).some(Boolean) ? data.utm : null;
  const channel = classifyLead({
    source: "form",
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    utm,
    referrer,
    siteHost: hostOf(origin) ?? hostOf(client.websiteUrl),
  });
  const clickAt = data.clickAt ? new Date(data.clickAt) : null;
  const firstTouch =
    data.firstTouch && Object.values(data.firstTouch).some(Boolean)
      ? {
          referrer: stripUrl(data.firstTouch.referrer) ?? undefined,
          landing: stripUrl(data.firstTouch.landing) ?? undefined,
          at: data.firstTouch.at,
        }
      : null;

  const [lead] = await db
    .insert(agencyLead)
    .values({
      repoId: client.repoId,
      source: "form",
      status: isSpam ? "spam" : "new",
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      message: message ?? null,
      fields: Object.keys(rest).length ? rest : null,
      formName: data.formName || null,
      pageUrl: stripUrl(data.pageUrl),
      referrer,
      utm,
      gclid: data.gclid || null,
      gbraid: data.gbraid || null,
      wbraid: data.wbraid || null,
      landingPage: stripUrl(data.landingPage),
      firstTouch,
      clickAt: clickAt && !Number.isNaN(clickAt.getTime()) ? clickAt : null,
      // No click id to verify, but utm_id names the campaign directly (the
      // Campaign URL Builder convention), so the campaign filter catches it.
      adClick:
        !data.gclid && !data.gbraid && !data.wbraid && /^\d+$/.test(utm?.id ?? "")
          ? { campaignId: utm!.id, campaignName: utm?.campaign }
          : null,
      channel,
    })
    .returning();

  // Report the new lead to Google Ads after responding; failures are retried
  // when the client next opens their leads.
  if (!isSpam) after(() => reportLeadStage(client, lead!, "lead"));

  if (!isSpam) {
    const lines: [string, string][] = [
      ...(name ? [["Name", name] as [string, string]] : []),
      ...(email ? [["Email", email] as [string, string]] : []),
      ...(phone ? [["Phone", phone] as [string, string]] : []),
      ...(message ? [["Message", message] as [string, string]] : []),
      ...Object.entries(rest),
      ["Source", CHANNEL_LABELS[channel]],
    ];
    const siteName =
      hostOf(client.websiteUrl) ?? client.repo ?? client.origins?.[0] ?? "your site";
    try {
      await sendEmail({
        from: "New Lead <noreply@alisamadii.com>",
        to: client.leadNotifyEmail ?? client.ownerEmail,
        ...(email ? { replyTo: email } : {}),
        subject: `New lead from ${name ?? email ?? phone ?? siteName}`,
        html: leadEmailHtml(lines, `${urls.cms}/p/${client.repoId}/agency/${lead!.id}`, siteName),
        text: [
          `New lead on ${siteName}`,
          "",
          ...lines.map(([label, value]) => `${label}: ${value}`),
          "",
          `${urls.cms}/p/${client.repoId}/agency/${lead!.id}`,
        ].join("\n"),
      });
    } catch (error) {
      // The lead is saved; a failed notification must not fail the visitor's submit.
      console.error("Agency lead notification failed", error);
    }
  }

  return NextResponse.json({ ok: true }, { headers });
}
