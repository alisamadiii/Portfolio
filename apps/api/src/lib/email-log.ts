import type { Context } from "hono";

import { createDb } from "../db/index.js";
import { emailLogs, type User } from "../db/schema.js";
import type { AppEnv } from "../middleware/auth.js";

import { capture } from "./posthog.js";
import { r2Client } from "./r2.js";

// Private R2 bucket holding one HTML file per sent email. Never public —
// clients get short-lived presigned URLs via GET /v1/emails/:id/html.
export const EMAILS_BUCKET = "emails";

// Archive a sent email: HTML copy to R2, then a log row keyed to the user.
// Called via executionCtx.waitUntil AFTER the send succeeded — it must never
// block or fail the response, so all errors end up in PostHog instead.
export async function logEmail(
  c: Context<AppEnv>,
  args: {
    user: User;
    kind: "send" | "contact";
    from: string;
    to: string[];
    subject: string;
    messageId: string;
    html: string;
    visitorEmail?: string;
    source?: string;
  }
): Promise<void> {
  const id = crypto.randomUUID();
  const r2Key = `${args.user.id}/${new Date().toISOString().slice(0, 7)}/${id}.html`;
  try {
    const { client, base } = r2Client(c.env);
    const res = await client.fetch(`${base}/${EMAILS_BUCKET}/${r2Key}`, {
      method: "PUT",
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: args.html,
    });
    if (!res.ok) throw new Error(`R2 PUT failed (${res.status})`);

    await createDb(c.env).insert(emailLogs).values({
      id,
      userId: args.user.id,
      kind: args.kind,
      fromAddress: args.from,
      to: args.to,
      subject: args.subject,
      messageId: args.messageId,
      r2Key,
      visitorEmail: args.visitorEmail,
      source: args.source,
    });
  } catch (err) {
    // The email itself went out — only the audit trail failed.
    capture(c, "$exception", {
      $exception_list: [
        { type: "EmailLogError", value: (err as Error).message },
      ],
      error_code: "EMAIL_LOG_FAILED",
      message: `Failed to archive email ${args.messageId}: ${(err as Error).message}`,
      expected: false,
    });
  }
}
