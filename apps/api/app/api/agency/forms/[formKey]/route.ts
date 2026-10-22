import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  agencyLead,
  hubProject,
  user as userTable,
  type AgencyLeadUtm,
} from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email/usesend";
import { CHANNEL_LABELS, classifyLead } from "@workspace/trpc/lib/agency/lead-channel";
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
// In-memory: best effort per serverless instance.

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

const isRateLimited = (key: string) => {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  hits.set(key, recent);
  return false;
};

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
  fields: z.record(z.string().max(100), z.string().max(5000)),
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
    else if (!picked.email && EMAIL_KEYS.includes(k)) picked.email = value;
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

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`${formKey}:${ip}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers }
    );
  }

  // text/plain body (no preflight), parsed as JSON.
  const parsed = bodySchema.safeParse(
    await req
      .text()
      .then((text) => JSON.parse(text))
      .catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const data = parsed.data;
  const { name, email, phone, message, rest } = splitFields(data.fields);

  if (!name && !email && !phone && !message && !Object.keys(rest).length) {
    return NextResponse.json({ error: "Empty submission" }, { status: 400, headers });
  }

  // Spam is kept (status "spam") so a false positive can still be recovered.
  const isSpam = Boolean(data.hp) || looksLikeSpam(`${message ?? ""} ${Object.values(rest).join(" ")}`);
  const utm: AgencyLeadUtm | null =
    data.utm && Object.values(data.utm).some(Boolean) ? data.utm : null;
  const channel = classifyLead({
    source: "form",
    gclid: data.gclid,
    gbraid: data.gbraid,
    wbraid: data.wbraid,
    utm,
    referrer: data.referrer,
    siteHost: hostOf(origin) ?? hostOf(client.websiteUrl),
  });
  const clickAt = data.clickAt ? new Date(data.clickAt) : null;
  const firstTouch =
    data.firstTouch && Object.values(data.firstTouch).some(Boolean) ? data.firstTouch : null;

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
      pageUrl: data.pageUrl || null,
      referrer: data.referrer || null,
      utm,
      gclid: data.gclid || null,
      gbraid: data.gbraid || null,
      wbraid: data.wbraid || null,
      landingPage: data.landingPage || null,
      firstTouch,
      clickAt: clickAt && !Number.isNaN(clickAt.getTime()) ? clickAt : null,
      channel,
    })
    .returning({ id: agencyLead.id });

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
