import { handleSmsWebhook } from "@workspace/trpc/lib/inbox";

export const maxDuration = 60;

// ─── Zernio messaging webhook ────────────────────────────────────
// The account webhook (made by lib/sms/zernio ensureWebhook) posts here:
// replies to a project's number land in its Leads inbox, delivery receipts
// update sent texts. Verify + parse: lib/sms/zernio. Apply: handleSmsEvent.
//
// POST /api/webhook/zernio

export const POST = (request: Request) => handleSmsWebhook("zernio", request);
