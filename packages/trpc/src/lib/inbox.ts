import "server-only";

import { randomBytes } from "node:crypto";
import { createElement } from "react";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/pool";
import {
  agencyClient,
  agencyLead,
  agencyMessage,
  hubProject,
  user as userTable,
} from "@workspace/drizzle/schema";
import LeadMessageTemplate from "@workspace/email/emails/lead-message";
import { sendEmail } from "@workspace/email/usesend";
import { renderEmailParts } from "@workspace/email/utils";

import { leadReplyTo } from "./inbound/reply-address";
import { OUTBOUND_LIMITS, senderDisplayName, toE164 } from "./inbox-shared";
import { putObject } from "./r2";
import { projectDisplayName } from "./partners-shared";
import { smsProvider, type SmsEvent, type SmsMedia, type SmsProvider, type SmsProviderId } from "./sms";

// Leads inbox, server side: sending a text/email to a lead and taking in
// texting webhooks (any provider, see lib/sms). Email replies come in through inbound-email.ts. Shared types + helpers: inbox-shared.ts.

type Client = typeof agencyClient.$inferSelect;
type Lead = typeof agencyLead.$inferSelect;

const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
const MEDIA_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Saves an image under inbox/<projectId>/ in the public media bucket. */
export async function putInboxMedia(projectId: string, bytes: Uint8Array, contentType: string) {
  const ext = MEDIA_TYPES[contentType];
  if (!ext) throw new Error("Only JPG, PNG, GIF or WebP images can be sent.");
  if (bytes.byteLength > MEDIA_MAX_BYTES) throw new Error("Images must be 5 MB or smaller.");
  const key = `inbox/${projectId}/${Date.now()}-${randomBytes(12).toString("hex")}.${ext}`;
  return putObject(key, bytes, contentType);
}

export const INBOX_MEDIA_TYPES = Object.keys(MEDIA_TYPES);
export const INBOX_MEDIA_MAX_BYTES = MEDIA_MAX_BYTES;

/** The business name emails are signed with: Settings, else the website host, else the repo. */
async function businessName(client: Client) {
  const [project] = await db
    .select({ name: hubProject.name, repo: hubProject.repo, websiteUrl: hubProject.websiteUrl })
    .from(hubProject)
    .where(eq(hubProject.id, client.projectId))
    .limit(1);
  return project ? projectDisplayName(project) : "Our team";
}

/** Replies to inbox emails go to the project's lead inbox, else the owner. */
async function replyToFor(client: Client) {
  const [row] = await db
    .select({ notifyEmail: hubProject.notifyEmail, ownerEmail: userTable.email })
    .from(agencyClient)
    .leftJoin(hubProject, eq(hubProject.id, agencyClient.projectId))
    .leftJoin(userTable, eq(userTable.id, agencyClient.userId))
    .where(eq(agencyClient.id, client.id))
    .limit(1);
  return row?.notifyEmail || row?.ownerEmail || undefined;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Send failed.");

/** Throws TOO_MANY_REQUESTS once the project hit its outbound limits. */
export async function assertOutboundQuota(projectId: string) {
  const since = (ms: number) => new Date(Date.now() - ms);
  const count = async (ms: number) => {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(agencyMessage)
      .where(
        and(
          eq(agencyMessage.projectId, projectId),
          eq(agencyMessage.direction, "out"),
          gt(agencyMessage.createdAt, since(ms))
        )
      );
    return row?.n ?? 0;
  };
  const [hour, day] = await Promise.all([count(3_600_000), count(86_400_000)]);
  if (hour >= OUTBOUND_LIMITS.perHour || day >= OUTBOUND_LIMITS.perDay) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You've sent a lot of messages in a short time. Try again later.",
    });
  }
}

/**
 * Sends one message to a lead and records it. The row is written first
 * (queued) so a failure still shows in the thread with its reason.
 */
export async function sendLeadMessage(input: {
  client: Client;
  lead: Lead;
  channel: "sms" | "email";
  body: string;
  subject?: string;
  mediaUrls?: string[];
  sender: { id: string; name?: string | null };
}) {
  const { client, lead, channel } = input;
  const [row] = await db
    .insert(agencyMessage)
    .values({
      projectId: client.projectId,
      leadId: lead.id,
      channel,
      direction: "out",
      body: input.body,
      subject: channel === "email" ? (input.subject ?? null) : null,
      mediaUrls: input.mediaUrls?.length ? input.mediaUrls : null,
      status: "queued",
      sentBy: input.sender.id,
    })
    .returning();

  let update: Partial<typeof agencyMessage.$inferInsert>;
  try {
    if (channel === "sms") {
      const to = toE164(lead.phone);
      if (!to) throw new Error("This lead's phone number can't receive texts.");
      if (!client.smsNumber) throw new Error("Texting isn't set up for this project yet.");
      const sent = await smsProvider().send({
        from: client.smsNumber,
        to,
        text: input.body,
        mediaUrls: input.mediaUrls,
        profileId: client.smsProfileId,
        idempotencyKey: `agency-message-${row!.id}`,
      });
      update = { providerId: sent.id, status: sent.status };
    } else {
      if (!lead.email) throw new Error("This lead has no email address.");
      const name = await businessName(client);
      // Answer their last email so it stays one thread in their mail app.
      const [lastIn] = await db
        .select({ id: agencyMessage.emailMessageId })
        .from(agencyMessage)
        .where(
          and(
            eq(agencyMessage.leadId, lead.id),
            eq(agencyMessage.direction, "in"),
            eq(agencyMessage.channel, "email"),
            sql`${agencyMessage.emailMessageId} is not null`
          )
        )
        .orderBy(desc(agencyMessage.createdAt))
        .limit(1);
      const { emailId } = await sendEmail({
        from: `"${senderDisplayName(name)}" <noreply@alisamadii.com>`,
        to: lead.email,
        // Replies come back into this thread when reply capture is wired,
        // else they go to the owner's own inbox.
        replyTo: leadReplyTo(lead.id) ?? (await replyToFor(client)),
        ...(lastIn?.id && { headers: { "In-Reply-To": lastIn.id, References: lastIn.id } }),
        subject: input.subject?.trim() || `A message from ${name}`,
        ...(await renderEmailParts(
          createElement(LeadMessageTemplate, {
            body: input.body,
            businessName: name,
            senderName: input.sender.name?.split(/\s+/)[0],
          })
        )),
      });
      update = { providerId: emailId, status: "sent" };
    }
  } catch (error) {
    update = { status: "failed", error: errorText(error) };
  }

  const now = new Date();
  const [saved] = await db
    .update(agencyMessage)
    .set(update)
    .where(eq(agencyMessage.id, row!.id))
    .returning();
  await db
    .update(agencyLead)
    .set({
      lastMessageAt: now,
      // Reaching out is what "contacted" means.
      ...(update.status !== "failed" &&
        lead.status === "new" && { status: "contacted", contactedAt: lead.contactedAt ?? now }),
    })
    .where(eq(agencyLead.id, lead.id));
  return saved!;
}

// ─── Texting webhooks ─────────────────────────────────────────────

/** Copies carrier media into R2 (provider links expire); skips what fails. */
async function keepMedia(provider: SmsProvider, projectId: string, media: SmsMedia[]) {
  const urls: string[] = [];
  for (const item of media.slice(0, 10)) {
    try {
      const res = await provider.fetchMedia(item.url);
      const type = (item.contentType || res.headers.get("content-type") || "").split(";")[0]!.trim();
      if (!res.ok || !MEDIA_TYPES[type]) continue;
      urls.push(await putInboxMedia(projectId, new Uint8Array(await res.arrayBuffer()), type));
    } catch (error) {
      console.error("[inbox] media copy failed", error);
    }
  }
  return urls;
}

/** The project's lead with this number (last 10 digits), newest first. */
async function leadByPhone(projectId: string, e164: string) {
  const last10 = e164.replace(/\D/g, "").slice(-10);
  const [lead] = await db
    .select()
    .from(agencyLead)
    .where(
      and(
        eq(agencyLead.projectId, projectId),
        sql`right(regexp_replace(coalesce(${agencyLead.phone}, ''), '\\D', '', 'g'), 10) = ${last10}`
      )
    )
    .orderBy(desc(agencyLead.createdAt))
    .limit(1);
  return lead ?? null;
}

/** Applies one verified texting event. Safe to receive twice. */
export async function handleSmsEvent(event: SmsEvent, provider: SmsProvider = smsProvider()) {
  if (event.type === "inbound") {
    const client = await db.query.agencyClient.findFirst({ where: eq(agencyClient.smsNumber, event.to) });
    if (!client) return;

    const seen = await db.query.agencyMessage.findFirst({
      where: eq(agencyMessage.providerId, event.messageId),
      columns: { id: true },
    });
    if (seen) return;

    const lead =
      (await leadByPhone(client.projectId, event.from)) ??
      (
        await db
          .insert(agencyLead)
          .values({
            projectId: client.projectId,
            source: "sms",
            channel: "direct",
            phone: event.from,
            message: event.text || null,
          })
          .returning()
      )[0]!;

    const mediaUrls = event.media.length ? await keepMedia(provider, client.projectId, event.media) : [];
    const now = new Date();
    await db
      .insert(agencyMessage)
      .values({
        projectId: client.projectId,
        leadId: lead.id,
        channel: "sms",
        direction: "in",
        body: event.text,
        mediaUrls: mediaUrls.length ? mediaUrls : null,
        status: "received",
        providerId: event.messageId,
      })
      .onConflictDoNothing();
    await db.update(agencyLead).set({ lastMessageAt: now }).where(eq(agencyLead.id, lead.id));
    return;
  }

  const { status } = event;
  await db
    .update(agencyMessage)
    .set({ status, error: status === "failed" ? event.error : null })
    .where(
      and(
        eq(agencyMessage.providerId, event.messageId),
        eq(agencyMessage.direction, "out"),
        // Events can arrive out of order: never step back from a final state.
        status === "delivered" || status === "failed"
          ? undefined
          : sql`${agencyMessage.status} in ('queued', 'sent')`
      )
    );
}

/**
 * One provider webhook delivery: verify, normalize, apply. Each provider's
 * apps/api route is just this. 500 makes the provider retry (handler is idempotent).
 */
export async function handleSmsWebhook(id: SmsProviderId, request: Request) {
  const provider = smsProvider(id);
  const rawBody = await request.text();
  const parsed = provider.parseWebhook(rawBody, request.headers);
  if (!parsed.ok) {
    if (parsed.status === 503) console.error(`[sms:${id}]`, parsed.reason);
    return new Response(parsed.reason, { status: parsed.status });
  }
  try {
    for (const event of parsed.events) await handleSmsEvent(event, provider);
  } catch (error) {
    console.error(`[sms:${id}] event failed`, error);
    return new Response("Error", { status: 500 });
  }
  return new Response(null, { status: 204 });
}
