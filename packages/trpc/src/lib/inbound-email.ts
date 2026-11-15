import "server-only";

import { createElement } from "react";
import { AwsClient } from "aws4fetch";
import { eq } from "drizzle-orm";
import PostalMime from "postal-mime";

import { db } from "@workspace/drizzle/pool";
import { agencyClient, agencyLead, agencyMessage, hubProject, user as userTable } from "@workspace/drizzle/schema";
import LeadReplyTemplate from "@workspace/email/emails/lead-reply";
import { sendEmail } from "@workspace/email/usesend";
import { renderEmailParts } from "@workspace/email/utils";
import { urls } from "@workspace/ui/lib/company";

import { leadIdFromAddress } from "./inbound/reply-address";
import { INBOX_MEDIA_TYPES, putInboxMedia } from "./inbox";
import { stripQuotedReply } from "./inbox-shared";

// Lead email replies -> Leads inbox. Inbox emails carry a signed Reply-To
// (r+<leadId>.<sig>@INBOX_REPLY_DOMAIN). That subdomain's MX is SES
// us-west-2; the receipt rule stores the raw mail in S3 and notifies SNS,
// which posts to apps/api /api/webhook/ses-inbound (verified in inbound/sns.ts).

let s3: AwsClient | null = null;

/** The raw email SES stored in the inbound bucket. */
export async function readInboundObject(bucket: string, key: string) {
  const { INBOUND_AWS_ACCESS_KEY_ID, INBOUND_AWS_SECRET_ACCESS_KEY } = process.env;
  const region = process.env.INBOUND_AWS_REGION || "us-west-2";
  if (!INBOUND_AWS_ACCESS_KEY_ID || !INBOUND_AWS_SECRET_ACCESS_KEY) {
    throw new Error("INBOUND_AWS_ACCESS_KEY_ID / INBOUND_AWS_SECRET_ACCESS_KEY are not set");
  }
  s3 ??= new AwsClient({
    accessKeyId: INBOUND_AWS_ACCESS_KEY_ID,
    secretAccessKey: INBOUND_AWS_SECRET_ACCESS_KEY,
    service: "s3",
    region,
  });
  const path = key.split("/").map(encodeURIComponent).join("/");
  const res = await s3.fetch(`https://${bucket}.s3.${region}.amazonaws.com/${path}`);
  if (!res.ok) throw new Error(`S3 read failed (${res.status}) for ${key}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Plain text from an HTML-only email (good enough for a chat bubble). */
const htmlToText = (html: string) =>
  html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<blockquote[\s\S]*$/i, "") // quoted history starts here
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

type Handled = { status: "stored" | "duplicate" | "ignored"; reason?: string; leadId?: number };

/**
 * Takes one received email (raw MIME) into the thread of the lead its reply
 * address names, then emails the owner a notice. Safe to receive twice.
 */
export async function handleInboundEmail(raw: Uint8Array | string, recipients: string[] = []): Promise<Handled> {
  const email = await PostalMime.parse(raw);

  const candidates = [
    ...recipients,
    ...(email.to ?? []).map((a) => a.address ?? ""),
    ...(email.cc ?? []).map((a) => a.address ?? ""),
    email.deliveredTo ?? "",
  ];
  const leadId = candidates.map(leadIdFromAddress).find((id): id is number => id !== null);
  if (!leadId) return { status: "ignored", reason: "no valid reply address" };

  const lead = await db.query.agencyLead.findFirst({ where: eq(agencyLead.id, leadId) });
  if (!lead) return { status: "ignored", reason: "lead not found" };

  const messageId = email.messageId?.trim() || null;
  if (messageId) {
    const seen = await db.query.agencyMessage.findFirst({
      where: eq(agencyMessage.providerId, messageId),
      columns: { id: true },
    });
    if (seen) return { status: "duplicate", leadId };
  }

  const text = stripQuotedReply(email.text?.trim() ? email.text : htmlToText(email.html ?? ""));

  // Images go to R2 like texted photos; anything else is named in the bubble.
  const mediaUrls: string[] = [];
  const otherFiles: string[] = [];
  for (const file of email.attachments ?? []) {
    const type = file.mimeType.toLowerCase();
    // Inline logos/signature images are noise; real photos are attachments.
    if (INBOX_MEDIA_TYPES.includes(type) && file.disposition !== "inline" && mediaUrls.length < 5) {
      try {
        const bytes =
          typeof file.content === "string" ? new TextEncoder().encode(file.content) : new Uint8Array(file.content);
        mediaUrls.push(await putInboxMedia(lead.projectId, bytes, type));
        continue;
      } catch (error) {
        console.error("[inbound-email] attachment skipped", error);
      }
    }
    if (file.disposition !== "inline" && file.filename) otherFiles.push(file.filename);
  }
  const body = [text, otherFiles.length ? `Attached: ${otherFiles.join(", ")}` : ""].filter(Boolean).join("\n\n");

  const inserted = await db
    .insert(agencyMessage)
    .values({
      projectId: lead.projectId,
      leadId: lead.id,
      channel: "email",
      direction: "in",
      body,
      subject: email.subject?.trim() || null,
      mediaUrls: mediaUrls.length ? mediaUrls : null,
      status: "received",
      providerId: messageId,
      emailMessageId: messageId,
    })
    .onConflictDoNothing()
    .returning({ id: agencyMessage.id });
  if (!inserted.length) return { status: "duplicate", leadId };

  await db.update(agencyLead).set({ lastMessageAt: new Date() }).where(eq(agencyLead.id, lead.id));

  try {
    await notifyOwner({ lead, body: text, subject: email.subject ?? undefined, imageCount: mediaUrls.length });
  } catch (error) {
    // The reply is saved; a failed notice must not make SNS retry it.
    console.error("[inbound-email] owner notice failed", error);
  }
  return { status: "stored", leadId: lead.id };
}

/** "New reply from Sarah" to the project's lead inbox (else the owner). */
async function notifyOwner(input: {
  lead: typeof agencyLead.$inferSelect;
  body: string;
  subject?: string;
  imageCount: number;
}) {
  const { lead } = input;
  const [row] = await db
    .select({ notifyEmail: hubProject.notifyEmail, ownerEmail: userTable.email })
    .from(agencyClient)
    .leftJoin(hubProject, eq(hubProject.id, agencyClient.projectId))
    .leftJoin(userTable, eq(userTable.id, agencyClient.userId))
    .where(eq(agencyClient.projectId, lead.projectId))
    .limit(1);
  const to = row?.notifyEmail || row?.ownerEmail;
  if (!to) return;

  const leadName = lead.name?.trim() || lead.email || "A lead";
  await sendEmail({
    from: "Client Hub <noreply@alisamadii.com>",
    to,
    subject: `New reply from ${leadName}`,
    ...(await renderEmailParts(
      createElement(LeadReplyTemplate, {
        leadName,
        body: input.body,
        subject: input.subject,
        imageCount: input.imageCount,
        conversationUrl: `${urls.cms}/p/${lead.projectId}/leads?tab=conversations&lead=${lead.id}`,
      })
    )),
  });
}
