import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  agencyRateLimit,
  hubProject,
  user as userTable,
} from "@workspace/drizzle/schema";
import { IP_LIMIT } from "@workspace/trpc/lib/agency/lead-capture";

// ─── Shared plumbing for the public agency endpoints ─────────────
// The form capture (forms/[formKey]) and booking (booking/[formKey]) routes
// are both reachable from visitors' browsers on clients' websites: same CORS
// shape, same origin allowlist, same Postgres rate limiter, same client
// lookup by form key, same notification email shell.

export const corsHeaders = (
  origin: string | null,
  methods = "POST, OPTIONS"
) => ({
  "Access-Control-Allow-Origin": origin ?? "*",
  "Access-Control-Allow-Methods": methods,
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
});

// ─── Rate limit ─────────────────────────────────────────────────
// Fixed window in Postgres so every serverless instance shares the count.
// The Origin check below only stops other websites; a script can fake it,
// so this and the per-form caps are what actually limit abuse.

export const isRateLimited = async (key: string, max = IP_LIMIT.max) => {
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
  return (row?.count ?? 0) > max;
};

// Set by Vercel itself; x-forwarded-for's first entry can be sent by the client.
export const clientIp = (req: Request) =>
  req.headers.get("x-real-ip") ??
  req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
  req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
  "unknown";

// ─── Origin check ───────────────────────────────────────────────

export const hostOf = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    return null;
  }
};

const withoutWww = (host: string) => host.replace(/^www\./, "");

export const isAllowedOrigin = (
  origin: string | null,
  project: {
    websiteUrl: string | null;
    customDomain: string | null;
    freeSubdomain: string | null;
  }
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

// ─── Client lookup ──────────────────────────────────────────────

/** The agency client behind a public form key; null when unknown or unlinked. */
export async function findClientByFormKey(formKey: string) {
  const [client] = await db
    .select({
      // From the joined website: a client with no website linked has no form.
      repoId: hubProject.repoId,
      userId: agencyClient.userId,
      leadNotifyEmail: agencyClient.leadNotifyEmail,
      ownerEmail: userTable.email,
      websiteUrl: hubProject.websiteUrl,
      customDomain: hubProject.customDomain,
      freeSubdomain: hubProject.freeSubdomain,
      repo: hubProject.repo,
      googleAdsCustomerId: agencyClient.googleAdsCustomerId,
      googleAdsActions: agencyClient.googleAdsActions,
      bookingSettings: agencyClient.bookingSettings,
    })
    .from(agencyClient)
    .innerJoin(userTable, eq(userTable.id, agencyClient.userId))
    .innerJoin(hubProject, eq(hubProject.repoId, agencyClient.repoId))
    .where(eq(agencyClient.formKey, formKey))
    .limit(1);
  return client ?? null;
}

// ─── Attribution payload (shared zod fragment) ──────────────────

const short = z.string().max(500).optional();

export const attributionSchema = z.object({
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
      id: short,
      term: short,
      content: short,
    })
    .optional(),
  // Honeypot: real visitors never fill it in.
  hp: z.string().max(500).optional(),
  // Milliseconds between page load and submit.
  t: z.number().int().nonnegative().optional(),
});

// ─── Notification email ─────────────────────────────────────────

export const escapeHtml = (value: string) =>
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

export const leadEmailHtml = (
  lines: [string, string][],
  leadUrl: string,
  siteName: string,
  opts?: { tag?: string; title?: string }
) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f4f1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eceae6;">
            <tr>
              <td style="padding:28px 32px 0;">
                <div style="font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#fc8464;">&#9642; ${escapeHtml(opts?.tag ?? "New lead")}</div>
                <div style="margin-top:10px;font:600 22px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-0.02em;color:#2b2926;">${escapeHtml(opts?.title ?? `Someone contacted ${siteName}`)}</div>
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
