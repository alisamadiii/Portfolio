import { and, desc, eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { z } from "zod";

import { createDb } from "../db/index.js";
import { emailLogs } from "../db/schema.js";
import { renderContactEmail } from "../lib/contact-template.js";
import { EMAILS_BUCKET, logEmail } from "../lib/email-log.js";
import { ApiError } from "../lib/errors.js";
import { KvRateStore } from "../lib/kv-rate-store.js";
import { r2Client } from "../lib/r2.js";
import { sendViaSes } from "../lib/ses.js";
import { parseBody } from "../lib/validate.js";
import { requireAuth, type AppEnv } from "../middleware/auth.js";

// Extract the bare address from a `from` value that may be either
// `user@domain.com` or display-name form `Name <user@domain.com>`.
const bareEmail = (from: string): string => {
  const match = from.match(/<([^>]+)>\s*$/);
  return (match ? match[1] : from).trim();
};

// SES accepts both a bare address and `Name <address>` for From. Validate the
// extracted address so display-name senders pass (previously .email() rejected
// them → VALIDATION_FAILED "from: Invalid email").
const fromField = z
  .string()
  .refine((v) => z.string().email().safeParse(bareEmail(v)).success, {
    message:
      "Invalid email — use 'user@domain.com' or 'Name <user@domain.com>'",
  });

// Combined attachment size limit: 1 MB (1 MiB).
const MAX_ATTACHMENTS_BYTES = 1_048_576;

// Decoded byte length of a base64 string, without allocating the bytes.
const decodedLen = (b64: string): number => {
  const len = b64.length;
  if (len === 0) return 0;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((len * 3) / 4) - padding;
};

const base64Re = /^[A-Za-z0-9+/]+={0,2}$/;

const sendSchema = z.object({
  from: fromField,
  to: z.union([z.string().email(), z.array(z.string().email()).min(1)]),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  // Free-form category stored on the log row (e.g. "newsletter", "receipt").
  type: z.string().trim().min(1).max(50).optional(),
  // Optional file attachments; content is base64. Combined decoded size must
  // stay under 1 MB (checked below); the SDK enforces the same limit up front.
  attachments: z
    .array(
      z.object({
        filename: z.string().min(1).max(255),
        content: z.string().min(1).regex(base64Re, "content must be base64"),
        contentType: z.string().min(1).max(150).optional(),
      })
    )
    .max(20)
    .optional()
    .refine(
      (a) =>
        !a ||
        a.reduce((n, f) => n + decodedLen(f.content), 0) < MAX_ATTACHMENTS_BYTES,
      { message: "attachments combined size must be under 1 MB" }
    ),
});

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  subject: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  // Client-specific extra form fields (phone, company, budget, …). Rendered
  // as a Details section in the email exactly as sent.
  metadata: z
    .record(
      z.string().min(1).max(100),
      z.union([z.string().max(2000), z.number(), z.boolean()])
    )
    .refine((m) => Object.keys(m).length <= 25, {
      message: "metadata may have at most 25 keys",
    })
    .optional(),
});

export const emails = new Hono<AppEnv>();

// Contact-form limiter: 5 requests / 10 min per IP, counted in Workers KV so
// the limit holds across isolates. Runs BEFORE requireAuth so bots get a 429
// without touching the DB. Throwing ApiError routes the 429 through onError —
// standard error shape + PostHog like every other error. Skipped entirely on
// wrangler dev (localhost) so local testing is never throttled.
const contactLimiter: MiddlewareHandler<AppEnv> = (c, next) =>
  rateLimiter<AppEnv>({
    windowMs: 10 * 60 * 1000,
    limit: 5,
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
        "Too many contact requests. Try again in a few minutes.",
        "The contact endpoint allows 5 requests per 10 minutes per IP."
      );
    },
  })(c, next);

// Contact-form submission. The server renders the notification email and
// delivers it to the key owner's account email — the caller can never choose
// the recipient, so a browser-exposed key can't be used to spam anyone else.
emails.post("/contact", contactLimiter, requireAuth, async (c) => {
  const data = await parseBody(c, contactSchema);
  const user = c.get("user");

  if (!user.emailDomain) {
    throw new ApiError(
      403,
      "EMAIL_DOMAIN_NOT_CONFIGURED",
      "Your account has no email domain configured.",
      "Ask an admin to set emailDomain on your user (PATCH /v1/admin/users/:id)."
    );
  }

  const subject = data.subject ?? `New contact from ${data.name}`;
  const source = data.source ?? c.req.header("Origin") ?? "Contact Form";
  const from = `Contact <noreply@${user.emailDomain.toLowerCase()}>`;
  const { html, text } = renderContactEmail({
    name: data.name,
    email: data.email,
    subject,
    message: data.message,
    source,
    device: c.req.header("User-Agent") ?? "Unknown",
    ip:
      c.req.header("CF-Connecting-IP") ??
      c.req.header("X-Forwarded-For") ??
      "Unknown",
    date: new Date(),
    metadata: data.metadata,
  });

  const id = await sendViaSes(c.env, {
    from,
    to: [user.email],
    subject,
    html,
    text,
    replyTo: data.email,
  });
  // Audit trail (DB row + HTML copy in R2) written after the response.
  c.executionCtx.waitUntil(
    logEmail(c, {
      user,
      type: "contact",
      from,
      to: [user.email],
      subject,
      messageId: id,
      html,
      visitorEmail: data.email,
      source,
    })
  );
  return c.json({ id }, 202);
});

// Send a transactional email (caller supplies rendered HTML). The sender must
// belong to the user's configured emailDomain; admins may send as anything.
emails.post("/send", requireAuth, async (c) => {
  const data = await parseBody(c, sendSchema);
  const user = c.get("user");
  const isAdmin = user.type === "admin";

  if (!isAdmin) {
    if (!user.emailDomain) {
      throw new ApiError(
        403,
        "EMAIL_DOMAIN_NOT_CONFIGURED",
        "Your account has no email domain configured.",
        "Ask an admin to set emailDomain on your user (PATCH /v1/admin/users/:id)."
      );
    }
    const domain = user.emailDomain.toLowerCase();
    if (
      !bareEmail(data.from)
        .toLowerCase()
        .endsWith("@" + domain)
    ) {
      throw new ApiError(
        403,
        "SENDER_DOMAIN_MISMATCH",
        `Sender "${data.from}" is not in your allowed domain (@${domain})`,
        "The from address must end with your user's emailDomain. Admin keys are exempt."
      );
    }
  }

  const recipients = Array.isArray(data.to) ? data.to : [data.to];

  // Send failures reach PostHog as $exception via onError, which already
  // attaches the request body. Successes are logged to email_logs below.
  const id = await sendViaSes(c.env, {
    from: data.from,
    to: recipients,
    subject: data.subject,
    html: data.html,
    text: data.text,
    attachments: data.attachments,
  });
  c.executionCtx.waitUntil(
    logEmail(c, {
      user,
      type: data.type ?? "send",
      from: data.from,
      to: recipients,
      subject: data.subject,
      messageId: id,
      html: data.html,
    })
  );
  return c.json({ id }, 202);
});

// The caller's own email history, newest first. `before` (ISO date) pages
// back through older rows. r2Key stays internal — HTML is fetched via the
// presigned-URL endpoint below.
emails.get("/", requireAuth, async (c) => {
  const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
  const before = c.req.query("before");
  const beforeDate = before ? new Date(before) : undefined;
  if (beforeDate && Number.isNaN(beforeDate.getTime())) {
    throw new ApiError(
      400,
      "INVALID_CURSOR",
      `before: "${before}" is not a valid date`,
      "Pass an ISO timestamp, e.g. before=2026-07-14T09:30:00Z (use the createdAt of the last row you received)."
    );
  }

  const userId = c.get("user").id;
  const rows = await createDb(c.env)
    .select({
      id: emailLogs.id,
      type: emailLogs.type,
      from: emailLogs.fromAddress,
      to: emailLogs.to,
      subject: emailLogs.subject,
      messageId: emailLogs.messageId,
      visitorEmail: emailLogs.visitorEmail,
      source: emailLogs.source,
      createdAt: emailLogs.createdAt,
    })
    .from(emailLogs)
    .where(
      beforeDate
        ? and(eq(emailLogs.userId, userId), lt(emailLogs.createdAt, beforeDate))
        : eq(emailLogs.userId, userId)
    )
    .orderBy(desc(emailLogs.createdAt))
    .limit(limit);

  return c.json({ emails: rows });
});

// Presigned URL for one archived email's HTML. The bucket is private; the
// URL is the only way to read it and dies after 15 minutes.
const HTML_URL_EXPIRES_IN = 60;
emails.get("/:id/html", requireAuth, async (c) => {
  const user = c.get("user");
  const [row] = await createDb(c.env)
    .select({ userId: emailLogs.userId, r2Key: emailLogs.r2Key })
    .from(emailLogs)
    .where(eq(emailLogs.id, c.req.param("id")))
    .limit(1);
  // Same 404 for "doesn't exist" and "not yours" — don't leak which.
  if (!row || (row.userId !== user.id && user.type !== "admin")) {
    throw new ApiError(
      404,
      "EMAIL_NOT_FOUND",
      "Email not found",
      "No email with that id in your history. List yours via GET /v1/emails."
    );
  }

  const { client, base } = r2Client(c.env);
  const signed = await client.sign(
    new Request(
      `${base}/${EMAILS_BUCKET}/${row.r2Key}?X-Amz-Expires=${HTML_URL_EXPIRES_IN}`
    ),
    { aws: { signQuery: true } }
  );
  return c.json({ url: signed.url, expiresIn: HTML_URL_EXPIRES_IN });
});
