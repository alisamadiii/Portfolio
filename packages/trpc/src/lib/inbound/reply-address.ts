import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { parseReplyAddress, replyAddress } from "../inbox-shared";

// Signed Reply-To addresses for Leads inbox emails:
// r+<leadId>.<sig>@INBOX_REPLY_DOMAIN, sig = HMAC(INBOX_REPLY_SECRET).

const replyDomain = () => process.env.INBOX_REPLY_DOMAIN?.trim() || null;

/** Whether replies to inbox emails come back into the hub. */
export const emailRepliesEnabled = () => Boolean(replyDomain() && process.env.INBOX_REPLY_SECRET);

export function replySig(leadId: number) {
  return createHmac("sha256", process.env.INBOX_REPLY_SECRET ?? "")
    .update(`lead:${leadId}`)
    .digest("hex")
    .slice(0, 12);
}

/** The Reply-To for an inbox email to this lead, or null when replies aren't wired. */
export function leadReplyTo(leadId: number) {
  const domain = replyDomain();
  return domain && emailRepliesEnabled() ? replyAddress(leadId, replySig(leadId), domain) : null;
}

/** The lead id a reply address belongs to, when its signature checks out. */
export function leadIdFromAddress(address: string) {
  const parsed = parseReplyAddress(address);
  if (!parsed || !emailRepliesEnabled()) return null;
  const expected = Buffer.from(replySig(parsed.leadId));
  const given = Buffer.from(parsed.sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? parsed.leadId : null;
}
