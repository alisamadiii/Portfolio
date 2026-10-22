import { after, NextResponse } from "next/server";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  agencyLead,
  agencyRateLimit,
  hubProject,
  user as userTable,
  type AgencyLeadUtm,
} from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email/usesend";
import {
  FORM_HOURLY_LIMIT,
  IP_LIMIT,
  MAX_BODY_BYTES,
  MAX_FIELDS,
  isEmail,
  stripUrl,
  tooFast,
} from "@workspace/trpc/lib/agency/lead-capture";
import { CHANNEL_LABELS, classifyLead } from "@workspace/trpc/lib/agency/lead-channel";
import { reportLeadStage } from "@workspace/trpc/lib/agency/conversion-uploads";
import { urls } from "@workspace/ui/lib/company";

// ─── Agency lead capture ────────────────────────────────────────
// Public endpoint behind the capture script (public/f.js) on agency clients'
// websites. Saves the submission as an agency_lead, with the ad click IDs
// and UTMs the script kept in its cookie, and emails the client.
//
// f.js posts JSON as text/plain, a "simple" CORS request with no preflight.
// The Origin header is still checked against the client's own domains.

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
});

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

// ─── Rate limit ─────────────────────────────────────────────────
// Fixed window in Postgres so every serverless instance shares the count.
// The Origin check below only stops other websites; a script can fake it,
// so this and the per-form cap are what actually limit abuse.

const isRateLimited = async (key: string) => {
  const windowStart = new Date(Date.now() - IP_LIMIT.windowMs);
  const [row] = await db
    .insert(agencyRateLimit)
    .values({ key, count: 1 })
    .onConflictDoUpdate({
      target: agencyRateLimit.key,
      set: {
        // Restart the window once it has expired, otherwise count up.
        count: sql`case when ${agencyRateLimit.windowStart} < ${windowStart} then 1 else ${agencyRateLimit.count} + 1 end`,
        windowStart: sql`case when ${agencyRateLimit.windowStart} < ${windowStart} then now() else ${agencyRateLimit.windowStart} end`,
      },
    })
    .returning({ count: agencyRateLimit.count });
  return (row?.count ?? 0) > IP_LIMIT.max;
};

// Set by Vercel itself; x-forwarded-for's first entry can be sent by the client.
const clientIp = (req: Request) =>
  req.headers.get("x-real-ip") ??
  req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
  req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
  "unknown";

// ─── Origin check ───────────────────────────────────────────────

const hostOf = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
};

const withoutWww = (host: string) => host.replace(/^www\./, "");

const isAllowedOrigin = (
  origin: string | null,
  project: { websiteUrl: string | null; customDomain: string | null; freeSubdomain: string | null }
) => {
  const host = hostOf(origin);
  if (!host) return false;
  if (process.env.NODE_ENV !== "production") return true;

  const own = [hostOf(project.websiteUrl), hostOf(project.customDomain)]
    .filter((h): h is string => Boolean(h))
    .map(withoutWww);
  if (own.includes(withoutWww(host))) return true;

  // Free subdomains are "<slug>.<content-pilot wildcard>" on our own domain.
  return Boolean(
    project.freeSubdomain &&
      host.startsWith(`${project.freeSubdomain}.`) &&
      host.endsWith(".alisamadii.com")
  );
};

// ─── Payload ────────────────────────────────────────────────────

const short = z.string().max(500).optional();

const bodySchema = z.object({
  fields: z
    .record(z.string().max(100), z.string().max(5000))
    .refine((fields) => Object.keys(fields).length <= MAX_FIELDS, "Too many fields"),
  formName: short,
  pageUrl: z.string().max(2000).optional(),
  referrer: z.string().max(2000).optional(),
  landingPage: z.string().max(2000).optional(),
  firstTouch: z
    .object({
      referrer: z.string().max(1000).optional(),
      landing: z.string().max(1000).optional(),
      at: z.string().max(40).optional(),
    })
    .optional(),
  clickAt: z.string().max(40).optional(),
  gclid: short,
  gbraid: short,
  wbraid: short,
  utm: z
    .object({
      source: short,
      medium: short,
      campaign: short,
      term: short,
      content: short,
    })
    .optional(),
  // Honeypot: real visitors never fill it in.
  hp: z.string().max(500).optional(),
  // Milliseconds between page load and submit.
  t: z.number().int().nonnegative().optional(),
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

// ─── Notification email ─────────────────────────────────────────

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const row = (label: string, value: string) => `
  <tr>
    <td style="padding:10px 16px;font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.08em;text-transform:uppercase;color:#a49d94;white-space:nowrap;vertical-align:top;border-bottom:1px solid #f1efec;">${escapeHtml(label)}</td>
    <td style="padding:10px 16px;font:400 14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2b2926;border-bottom:1px solid #f1efec;white-space:pre-wrap;">${escapeHtml(value)}</td>
  </tr>`;

const leadEmailHtml = (lines: [string, string][], leadUrl: string, siteName: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f4f1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eceae6;">
            <tr>
              <td style="padding:28px 32px 0;">
                <div style="font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#fc8464;">&#9642; New lead</div>
                <div style="margin-top:10px;font:600 22px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-0.02em;color:#2b2926;">Someone contacted ${escapeHtml(siteName)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 16px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1efec;border-radius:12px;border-collapse:separate;overflow:hidden;">
                  ${lines.map(([label, value]) => row(label, value)).join("")}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px;">
                <a href="${leadUrl}" style="display:inline-block;background:#2b2926;color:#faf6f2;font:500 14px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:13px 26px;border-radius:999px;text-decoration:none;">Open in Hub</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

// ─── Handler ────────────────────────────────────────────────────

export async function POST(
  req: Request,
  { params }: { params: Promise<{ formKey: string }> }
) {
  const { formKey } = await params;
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const [client] = await db
    .select({
      // From the joined website: a client with no website linked has no form.
      repoId: hubProject.repoId,
      leadNotifyEmail: agencyClient.leadNotifyEmail,
      ownerEmail: userTable.email,
      websiteUrl: hubProject.websiteUrl,
      customDomain: hubProject.customDomain,
      freeSubdomain: hubProject.freeSubdomain,
      repo: hubProject.repo,
      googleAdsCustomerId: agencyClient.googleAdsCustomerId,
      googleAdsActions: agencyClient.googleAdsActions,
    })
    .from(agencyClient)
    .innerJoin(userTable, eq(userTable.id, agencyClient.userId))
    .innerJoin(hubProject, eq(hubProject.repoId, agencyClient.repoId))
    .where(eq(agencyClient.formKey, formKey))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404, headers });
  }
  if (!isAllowedOrigin(origin, client)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Submission too large" }, { status: 413, headers });
  }

  if (await isRateLimited(`form:${formKey}:${clientIp(req)}`)) {
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
    const siteName = hostOf(client.websiteUrl) ?? client.repo;
    try {
      await sendEmail({
        from: "New Lead <noreply@alisamadii.com>",
        to: client.leadNotifyEmail ?? client.ownerEmail,
        ...(email ? { replyTo: email } : {}),
        subject: `New lead from ${name ?? email ?? phone ?? siteName}`,
        html: leadEmailHtml(lines, `${urls.cms}/agency/${lead!.id}`, siteName),
        text: [
          `New lead on ${siteName}`,
          "",
          ...lines.map(([label, value]) => `${label}: ${value}`),
          "",
          `${urls.cms}/agency/${lead!.id}`,
        ].join("\n"),
      });
    } catch (error) {
      // The lead is saved; a failed notification must not fail the visitor's submit.
      console.error("Agency lead notification failed", error);
    }
  }

  return NextResponse.json({ ok: true }, { headers });
}
