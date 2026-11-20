import { handleSmsWebhook } from "@workspace/trpc/lib/inbox";

export const maxDuration = 60;

// ─── Telnyx messaging webhook ────────────────────────────────────
// Every project's messaging profile posts here: replies to a project's number
// land in its Leads inbox, delivery receipts update sent texts.
// Verify + parse: lib/sms/telnyx. Apply: handleSmsEvent (lib/inbox.ts).
//
// POST /api/webhook/telnyx

export const POST = (request: Request) => handleSmsWebhook("telnyx", request);
