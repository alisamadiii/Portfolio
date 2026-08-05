import { and, eq, inArray, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { createDb } from "../db/index.js";
import { users } from "../db/schema.js";
import {
  apiClientSettings,
  marketingCampaigns,
  marketingContacts,
  marketingSettings,
  marketingSuppressions,
} from "@workspace/drizzle/schema";
import { EMAILS_BUCKET } from "../lib/email-log.js";
import { ApiError } from "../lib/errors.js";
import { KvRateStore } from "../lib/kv-rate-store.js";
import { wrapMarketingHtml } from "../lib/marketing-template.js";
import { personalize } from "../lib/marketing-template.js";
import { r2Client } from "../lib/r2.js";
import { sendMarketingViaSes } from "../lib/ses-v2.js";
import { verifyUnsubToken } from "../lib/unsub-token.js";
import { parseBody } from "../lib/validate.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";
import { MARKETING_CONFIG_SET } from "../workflows/send-campaign.js";

export const marketing = new Hono<AppEnv>();

// Hub routes call the Worker with the admin key and pass the campaign
// owner's userId (same pattern as the tRPC → Worker email calls). Non-admin
// keys always act as their own user.
const actAsSchema = z.object({ userId: z.string().min(1).optional() });

const resolveUserId = (
  c: { get: (k: "user") => { id: string; type: string } },
  bodyUserId?: string
): string => {
  const user = c.get("user");
  if (bodyUserId && user.type !== "admin") {
    throw new ApiError(
      403,
      "ADMIN_REQUIRED",
      "Only admin keys may act on behalf of another user."
    );
  }
  return bodyUserId ?? user.id;
};

// Load campaign + owner context in one place; 404 hides foreign campaigns.
async function loadCampaign(
  db: ReturnType<typeof createDb>,
  campaignId: string,
  userId: string
) {
  const [row] = await db
    .select({
      campaign: marketingCampaigns,
      owner: users,
      settings: marketingSettings,
      apiSettings: apiClientSettings,
    })
    .from(marketingCampaigns)
    .innerJoin(users, eq(marketingCampaigns.userId, users.id))
    .leftJoin(
      marketingSettings,
      eq(marketingSettings.userId, marketingCampaigns.userId)
    )
    .leftJoin(
      apiClientSettings,
      eq(apiClientSettings.userId, marketingCampaigns.userId)
    )
    .where(
      and(
        eq(marketingCampaigns.id, campaignId),
        eq(marketingCampaigns.userId, userId)
      )
    )
    .limit(1);
  if (!row) {
    throw new ApiError(
      404,
      "CAMPAIGN_NOT_FOUND",
      "Campaign not found",
      "No campaign with that id belongs to this user."
    );
  }
  return row;
}

// Validate sender config and return the From address. Admin owners (Ali) are
// exempt from the domain check, mirroring POST /v1/emails/send.
function resolveFrom(row: Awaited<ReturnType<typeof loadCampaign>>): string {
  const settings = row.settings;
  if (!settings?.fromEmail) {
    throw new ApiError(
      400,
      "MARKETING_SETTINGS_INCOMPLETE",
      "Set a from address in your marketing settings before sending."
    );
  }
  if (!settings.postalAddress) {
    throw new ApiError(
      400,
      "MARKETING_SETTINGS_INCOMPLETE",
      "Set your postal address in marketing settings before sending.",
      "Bulk email legally requires a physical postal address in the footer (CAN-SPAM)."
    );
  }
  if (row.owner.role !== "admin") {
    const domain = row.apiSettings?.emailDomain?.toLowerCase();
    if (!domain) {
      throw new ApiError(
        403,
        "EMAIL_DOMAIN_NOT_CONFIGURED",
        "Your account has no email domain configured.",
        "Ask an admin to set emailDomain on your user."
      );
    }
    if (!settings.fromEmail.toLowerCase().endsWith("@" + domain)) {
      throw new ApiError(
        403,
        "SENDER_DOMAIN_MISMATCH",
        `Sender "${settings.fromEmail}" is not in your allowed domain (@${domain})`
      );
    }
  }
  return settings.fromName
    ? `${settings.fromName} <${settings.fromEmail}>`
    : settings.fromEmail;
}

// Newsletter signup limiter: 10 requests / 10 min per IP. The subscribe
// endpoint is meant for browser-embedded public keys, so bots hammering a
// client's signup form get throttled before touching the DB. Skipped on
// wrangler dev like the contact limiter.
const subscribeLimiter: MiddlewareHandler<AppEnv> = (c, next) =>
  rateLimiter<AppEnv>({
    windowMs: 10 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-6",
    skip: (c) => {
      const host = new URL(c.req.url).hostname;
      return host === "localhost" || host === "127.0.0.1";
    },
    keyGenerator: (c) =>
      c.req.header("CF-Connecting-IP") ??
      c.req.header("X-Forwarded-For") ??
      "anon",
    store: new KvRateStore(c.env.RATE_LIMIT_KV),
    handler: () => {
      throw new ApiError(
        429,
        "RATE_LIMIT_EXCEEDED",
        "Too many subscribe requests. Try again in a few minutes.",
        "The subscribe endpoint allows 10 requests per 10 minutes per IP."
      );
    },
  })(c, next);

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  firstName: z.string().trim().max(100).optional(),
  lastName: z.string().trim().max(100).optional(),
});

// Newsletter signup from a client website. The key identifies whose contact
// list the visitor lands in — the caller can never choose. Re-submitting is an
// explicit opt-in, so an unsubscribed contact is re-subscribed.
marketing.post("/subscribe", subscribeLimiter, requireAuth, async (c) => {
  const data = await parseBody(c, subscribeSchema);
  const user = c.get("user");

  const [row] = await createDb(c.env)
    .insert(marketingContacts)
    .values({
      userId: user.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    })
    .onConflictDoUpdate({
      target: [marketingContacts.userId, marketingContacts.email],
      set: {
        status: "subscribed",
        unsubscribedAt: null,
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName ? { lastName: data.lastName } : {}),
      },
    })
    .returning({ id: marketingContacts.id });

  return c.json({ id: row!.id, status: "subscribed" }, 201);
});

// Start a campaign: snapshot recipients, archive the wrapped HTML to R2, and
// hand off to the SendCampaignWorkflow. Returns 202 immediately — progress is
// read from marketing_campaign_recipients.
marketing.post("/campaigns/:id/send", requireAuth, async (c) => {
  const body = await parseBody(c, actAsSchema);
  const userId = resolveUserId(c, body.userId);
  const db = createDb(c.env);
  const campaignId = c.req.param("id");

  const row = await loadCampaign(db, campaignId, userId);
  if (row.campaign.status !== "draft") {
    throw new ApiError(
      409,
      "CAMPAIGN_NOT_DRAFT",
      `Campaign is "${row.campaign.status}" — only drafts can be sent.`
    );
  }
  if (!row.campaign.html?.trim()) {
    throw new ApiError(400, "CAMPAIGN_EMPTY", "Campaign has no content.");
  }
  const fromAddress = resolveFrom(row);

  // Snapshot subscribed contacts; addresses on the global suppression list
  // come in pre-marked so they are visible in the recipient table but never
  // reach the send loop.
  await db.execute(sql`
    insert into marketing_campaign_recipients
      (campaign_id, contact_id, email, first_name, last_name, status)
    select ${campaignId}::uuid, c.id, c.email, c.first_name, c.last_name,
      case when s.email is not null then 'suppressed' else 'pending' end
    from marketing_contacts c
    left join marketing_suppressions s on s.email = c.email
    where c.user_id = ${userId} and c.status = 'subscribed'
    on conflict (campaign_id, email) do nothing
  `);
  const [{ total } = { total: 0 }] = (
    await db.execute(sql`
      select count(*)::int as total from marketing_campaign_recipients
      where campaign_id = ${campaignId}::uuid
    `)
  ).rows as { total: number }[];
  if (total === 0) {
    throw new ApiError(
      400,
      "NO_RECIPIENTS",
      "No subscribed contacts to send to."
    );
  }

  // One archive per campaign (unlike transactional email's per-send copies).
  const wrapped = wrapMarketingHtml({
    body: row.campaign.html,
    editor: row.campaign.editor,
    fromName: row.settings?.fromName,
    postalAddress: row.settings?.postalAddress ?? "",
  });
  const r2Key = `marketing/${userId}/${campaignId}.html`;
  const { client, base } = r2Client(c.env);
  const put = await client.fetch(`${base}/${EMAILS_BUCKET}/${r2Key}`, {
    method: "PUT",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: wrapped,
  });
  if (!put.ok) {
    throw new ApiError(502, "ARCHIVE_FAILED", `R2 PUT failed (${put.status})`);
  }

  await db
    .update(marketingCampaigns)
    .set({
      status: "sending",
      fromAddress,
      r2Key,
      recipientCount: total,
      startedAt: new Date(),
      workflowInstanceId: campaignId,
      updatedAt: new Date(),
    })
    .where(eq(marketingCampaigns.id, campaignId));

  try {
    await c.env.SEND_CAMPAIGN.create({
      id: campaignId,
      params: { campaignId, userId },
    });
  } catch (err) {
    await db
      .update(marketingCampaigns)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(marketingCampaigns.id, campaignId));
    throw err;
  }

  return c.json({ id: campaignId, recipients: total }, 202);
});

// Personalized single send to the campaign owner's account email. No
// recipient rows, no config-set events — just "what will this look like".
marketing.post("/campaigns/:id/test", requireAuth, async (c) => {
  const body = await parseBody(c, actAsSchema);
  const userId = resolveUserId(c, body.userId);
  const db = createDb(c.env);

  const row = await loadCampaign(db, c.req.param("id"), userId);
  if (!row.campaign.html?.trim()) {
    throw new ApiError(400, "CAMPAIGN_EMPTY", "Campaign has no content.");
  }
  const fromAddress = resolveFrom(row);

  const wrapped = wrapMarketingHtml({
    body: row.campaign.html,
    editor: row.campaign.editor,
    fromName: row.settings?.fromName,
    postalAddress: row.settings?.postalAddress ?? "",
  });
  const html = personalize(
    wrapped,
    { email: row.owner.email, firstName: row.owner.name ?? "there" },
    "#"
  );
  const id = await sendMarketingViaSes(c.env, {
    from: fromAddress,
    to: row.owner.email,
    subject: `[Test] ${row.campaign.subject}`,
    html,
    replyTo: row.settings?.replyTo ?? undefined,
  });
  return c.json({ id }, 202);
});

const transitions = {
  pause: { from: ["sending"], to: "paused" },
  resume: { from: ["paused"], to: "sending" },
  cancel: { from: ["sending", "paused"], to: "canceled" },
} as const;

for (const [action, t] of Object.entries(transitions) as [
  keyof typeof transitions,
  (typeof transitions)[keyof typeof transitions],
][]) {
  marketing.post(`/campaigns/:id/${action}`, requireAuth, async (c) => {
    const body = await parseBody(c, actAsSchema);
    const userId = resolveUserId(c, body.userId);
    const db = createDb(c.env);

    const row = await loadCampaign(db, c.req.param("id"), userId);
    if (!(t.from as readonly string[]).includes(row.campaign.status)) {
      throw new ApiError(
        409,
        "INVALID_CAMPAIGN_STATE",
        `Cannot ${action} a "${row.campaign.status}" campaign.`
      );
    }
    if (!row.campaign.workflowInstanceId) {
      throw new ApiError(409, "NO_WORKFLOW", "Campaign has no send workflow.");
    }

    // DB first so the workflow's per-batch status check also sees it —
    // terminate() alone can race a batch that is mid-flight.
    await db
      .update(marketingCampaigns)
      .set({ status: t.to, updatedAt: new Date() })
      .where(eq(marketingCampaigns.id, row.campaign.id));

    const instance = await c.env.SEND_CAMPAIGN.get(
      row.campaign.workflowInstanceId
    );
    try {
      if (action === "pause") await instance.pause();
      else if (action === "resume") await instance.resume();
      else await instance.terminate();
    } catch {
      // Instance already finished/errored — the DB status is what the UI and
      // the send loop obey, so a dead instance is not an error here.
    }

    return c.json({ id: row.campaign.id, status: t.to });
  });
}

// ─── Public endpoints (no API key) ──────────────────────────────────────────

const unsubPage = (inner: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Unsubscribe</title></head>
<body style="margin:0;font-family:Helvetica,Arial,sans-serif;background:#f5f5f5;display:flex;align-items:center;justify-content:center;min-height:100vh;">
<div style="background:#fff;border-radius:8px;padding:40px;max-width:420px;text-align:center;">${inner}</div>
</body></html>`;

// Confirmation page with a POST form — GET must never mutate, or link
// prefetchers/scanners would unsubscribe people who never clicked.
marketing.get("/unsubscribe", async (c) => {
  const contactId = c.req.query("c") ?? "";
  const token = c.req.query("t") ?? "";
  if (!(await verifyUnsubToken(c.env, contactId, token))) {
    return c.html(unsubPage("<p>This unsubscribe link is invalid.</p>"), 400);
  }
  return c.html(
    unsubPage(`
      <h2 style="margin:0 0 8px;font-size:18px;">Unsubscribe</h2>
      <p style="color:#666;font-size:14px;">You will no longer receive these emails.</p>
      <form method="post" action="/v1/marketing/unsubscribe?c=${contactId}&t=${token}">
        <button type="submit" style="background:#111;color:#fff;border:0;border-radius:6px;padding:10px 24px;font-size:14px;cursor:pointer;">Unsubscribe</button>
      </form>`)
  );
});

// Form target + RFC 8058 one-click target (mail clients POST here directly).
marketing.post("/unsubscribe", async (c) => {
  const contactId = c.req.query("c") ?? "";
  const token = c.req.query("t") ?? "";
  if (!(await verifyUnsubToken(c.env, contactId, token))) {
    return c.html(unsubPage("<p>This unsubscribe link is invalid.</p>"), 400);
  }
  await createDb(c.env)
    .update(marketingContacts)
    .set({ status: "unsubscribed", unsubscribedAt: new Date() })
    .where(
      and(
        eq(marketingContacts.id, contactId),
        eq(marketingContacts.status, "subscribed")
      )
    );
  return c.html(
    unsubPage(
      "<h2 style='margin:0 0 8px;font-size:18px;'>You're unsubscribed</h2><p style='color:#666;font-size:14px;'>You will no longer receive these emails.</p>"
    )
  );
});

// SES → SNS event webhook (bounces + complaints). Auth is the random path
// segment; full SNS signature verification is skipped on purpose — the worst
// a forger can do is suppress an address, and the SubscribeURL host check
// stops subscription hijacking.
type SnsEnvelope = {
  Type?: string;
  SubscribeURL?: string;
  Message?: string;
};
type SesEvent = {
  notificationType?: string;
  eventType?: string;
  mail?: { tags?: Record<string, string[]> };
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: { emailAddress?: string }[];
  };
  complaint?: {
    complaintFeedbackType?: string;
    complainedRecipients?: { emailAddress?: string }[];
  };
};

marketing.post("/sns/:secret", async (c) => {
  if (
    !c.env.MARKETING_SNS_SECRET ||
    c.req.param("secret") !== c.env.MARKETING_SNS_SECRET
  ) {
    throw new ApiError(403, "FORBIDDEN", "Invalid SNS endpoint.");
  }

  // SNS posts JSON with Content-Type text/plain.
  let envelope: SnsEnvelope;
  try {
    envelope = JSON.parse(await c.req.text()) as SnsEnvelope;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Body is not valid JSON.");
  }

  if (envelope.Type === "SubscriptionConfirmation" && envelope.SubscribeURL) {
    const host = new URL(envelope.SubscribeURL).hostname;
    if (!host.endsWith(".amazonaws.com")) {
      throw new ApiError(400, "INVALID_SNS", "SubscribeURL is not AWS.");
    }
    await fetch(envelope.SubscribeURL);
    return c.json({ ok: true });
  }

  if (envelope.Type !== "Notification" || !envelope.Message) {
    return c.json({ ok: true });
  }

  let event: SesEvent;
  try {
    event = JSON.parse(envelope.Message) as SesEvent;
  } catch {
    return c.json({ ok: true });
  }
  const kind = event.eventType ?? event.notificationType;
  const sourceUserId = event.mail?.tags?.userId?.[0] ?? null;

  let reason: "bounce" | "complaint" | null = null;
  let detail: string | undefined;
  let addresses: string[] = [];
  if (kind === "Bounce" && event.bounce?.bounceType === "Permanent") {
    reason = "bounce";
    detail = event.bounce.bounceSubType;
    addresses = (event.bounce.bouncedRecipients ?? [])
      .map((r) => r.emailAddress ?? "")
      .filter(Boolean);
  } else if (kind === "Complaint") {
    reason = "complaint";
    detail = event.complaint?.complaintFeedbackType;
    addresses = (event.complaint?.complainedRecipients ?? [])
      .map((r) => r.emailAddress ?? "")
      .filter(Boolean);
  }

  if (reason && addresses.length > 0) {
    const emails = addresses.map((a) => a.toLowerCase().trim());
    const db = createDb(c.env);
    await db
      .insert(marketingSuppressions)
      .values(emails.map((email) => ({ email, reason: reason!, detail, sourceUserId })))
      .onConflictDoNothing();
    // Complaints also stop future sends from the same list immediately.
    if (reason === "complaint" && sourceUserId) {
      await db
        .update(marketingContacts)
        .set({ status: "unsubscribed", unsubscribedAt: new Date() })
        .where(
          and(
            eq(marketingContacts.userId, sourceUserId),
            inArray(marketingContacts.email, emails)
          )
        );
    }
  }

  return c.json({ ok: true });
});
