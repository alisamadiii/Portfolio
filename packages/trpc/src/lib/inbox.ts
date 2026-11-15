import "server-only";

import { createElement } from "react";
import { and, desc, eq, sql } from "drizzle-orm";

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
import { telnyxStatus, toE164 } from "./inbox-shared";
import { putObject } from "./r2";
import { BUSINESS_CONTACT_KEYS } from "./templates-shared";
import { sendSms, TelnyxError } from "./telnyx/client";

// Leads inbox, server side: sending a text/email to a lead and taking in
// Telnyx message events. Email replies come in through inbound-email.ts. Shared types + helpers: inbox-shared.ts.

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
  const key = `inbox/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return putObject(key, bytes, contentType);
}

export const INBOX_MEDIA_TYPES = Object.keys(MEDIA_TYPES);
export const INBOX_MEDIA_MAX_BYTES = MEDIA_MAX_BYTES;

/** The business name emails are signed with: Business info, else the site. */
async function businessName(client: Client) {
  const fromInfo = client.businessInfo?.[BUSINESS_CONTACT_KEYS.name]?.find((v) => v?.trim())?.trim();
  if (fromInfo) return fromInfo;
  const [project] = await db
    .select({ repo: hubProject.repo, websiteUrl: hubProject.websiteUrl })
    .from(hubProject)
    .where(eq(hubProject.id, client.projectId))
    .limit(1);
  return (
    project?.websiteUrl?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "") ||
    project?.repo ||
    "Our team"
  );
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

const errorText = (error: unknown) =>
  error instanceof TelnyxError || error instanceof Error ? error.message : "Send failed.";

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
      const sent = await sendSms({
        from: client.smsNumber,
        to,
        text: input.body,
        mediaUrls: input.mediaUrls,
        messagingProfileId: client.smsProfileId,
      });
      update = { providerId: sent.id, status: telnyxStatus(sent.status) };
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
        from: `${name.replace(/[<>"]/g, "")} <noreply@alisamadii.com>`,
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

// ─── Telnyx events ────────────────────────────────────────────────

export type TelnyxEvent = {
  data?: {
    event_type?: string;
    payload?: {
      id?: string;
      from?: { phone_number?: string };
      to?: { phone_number?: string; status?: string }[];
      text?: string;
      media?: { url?: string; content_type?: string }[];
      errors?: { title?: string; detail?: string }[];
    };
  };
};

/** Copies carrier media into R2 (Telnyx links expire); skips what fails. */
async function keepMedia(projectId: string, media: { url?: string; content_type?: string }[]) {
  const urls: string[] = [];
  for (const item of media.slice(0, 10)) {
    if (!item.url) continue;
    try {
      const res = await fetch(item.url, { signal: AbortSignal.timeout(15_000) });
      const type = (item.content_type || res.headers.get("content-type") || "").split(";")[0]!.trim();
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

/** Applies one verified Telnyx webhook event. Safe to receive twice. */
export async function handleTelnyxEvent(event: TelnyxEvent) {
  const type = event.data?.event_type;
  const payload = event.data?.payload;
  if (!type || !payload?.id) return;

  if (type === "message.received") {
    const to = payload.to?.[0]?.phone_number;
    const from = toE164(payload.from?.phone_number);
    if (!to || !from) return;
    const client = await db.query.agencyClient.findFirst({ where: eq(agencyClient.smsNumber, to) });
    if (!client) return;

    const seen = await db.query.agencyMessage.findFirst({
      where: eq(agencyMessage.providerId, payload.id),
      columns: { id: true },
    });
    if (seen) return;

    const lead =
      (await leadByPhone(client.projectId, from)) ??
      (
        await db
          .insert(agencyLead)
          .values({
            projectId: client.projectId,
            source: "sms",
            channel: "direct",
            phone: from,
            message: payload.text || null,
          })
          .returning()
      )[0]!;

    const mediaUrls = payload.media?.length ? await keepMedia(client.projectId, payload.media) : [];
    const now = new Date();
    await db
      .insert(agencyMessage)
      .values({
        projectId: client.projectId,
        leadId: lead.id,
        channel: "sms",
        direction: "in",
        body: payload.text ?? "",
        mediaUrls: mediaUrls.length ? mediaUrls : null,
        status: "received",
        providerId: payload.id,
      })
      .onConflictDoNothing();
    await db.update(agencyLead).set({ lastMessageAt: now }).where(eq(agencyLead.id, lead.id));
    return;
  }

  if (type === "message.sent" || type === "message.finalized") {
    const status = telnyxStatus(payload.to?.[0]?.status);
    const error = payload.errors?.[0];
    await db
      .update(agencyMessage)
      .set({
        status,
        error: status === "failed" ? error?.detail || error?.title || "The carrier didn't deliver this text." : null,
      })
      .where(
        and(
          eq(agencyMessage.providerId, payload.id),
          eq(agencyMessage.direction, "out"),
          // Events can arrive out of order: never step back from a final state.
          status === "delivered" || status === "failed"
            ? undefined
            : sql`${agencyMessage.status} in ('queued', 'sent')`
        )
      );
  }
}
