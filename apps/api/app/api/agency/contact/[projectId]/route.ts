import { NextResponse } from "next/server";
import { z } from "zod";

import { usesendFetch } from "@workspace/email/usesend";
import {
  MAX_BODY_BYTES,
  MAX_FIELDS,
  isEmail,
  stripUrl,
  tooFast,
} from "@workspace/trpc/lib/agency/lead-capture";
import { urls } from "@workspace/ui/lib/company";

import {
  clientIp,
  corsHeaders,
  findContactClientByProjectId,
  hostOf,
  isAllowedOrigin,
  isRateLimited,
  leadEmailHtml,
  parseProjectIdParam,
} from "@/lib/agency-public";

// ─── Contact email ──────────────────────────────────────────────
// Public endpoint behind the contact script (public/contact.js) on clients' websites.
// Unlike the lead-capture endpoint, this just sends the site owner an email
// through the PROJECT'S OWN useSend team (hub_project.usesendApiKey), from its
// agency-managed sending subdomain — so every message shows up in that project's
// Emails view. No lead row, no ad attribution.
//
// contact.js posts JSON as text/plain (a "simple" CORS request, no preflight). The
// Origin header is still checked against the client's own domains.

// The shared agency sending domain (matches the useSend instance's
// USESEND_SHARED_SENDING_DOMAIN). Every project's team may send from it; the
// send is recorded under the project's own team, so it shows only in that
// project's Emails view.
const SENDING_DOMAIN = process.env.USESEND_AGENCY_DOMAIN ?? "alisamadii.com";

export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders(req.headers.get("origin")),
  });
}

const short = z.string().max(500).optional();

const bodySchema = z.object({
  fields: z
    .record(z.string().max(100), z.string().max(5000))
    .refine((fields) => Object.keys(fields).length <= MAX_FIELDS, "Too many fields"),
  formName: short,
  pageUrl: z.string().max(2000).optional(),
  // Honeypot + time-to-submit, same shape as the other scripts.
  hp: short,
  t: z.number().int().nonnegative().optional(),
});

const EMAIL_KEYS = ["email", "e-mail", "email_address", "your-email", "your_email"];
const NAME_KEYS = ["name", "full_name", "fullname", "your-name", "your_name"];

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId: projectIdParam } = await params;
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  const projectId = parseProjectIdParam(projectIdParam);
  if (projectId === null) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404, headers });
  }

  const client = await findContactClientByProjectId(projectId);
  if (!client) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404, headers });
  }
  if (!isAllowedOrigin(origin, client)) {
    return NextResponse.json({ error: "Origin not allowed" }, { status: 403, headers });
  }

  // Sending needs a provisioned team (the project's useSend team key). Sending
  // itself runs on the shared agency domain, always available.
  if (!client.usesendApiKey) {
    return NextResponse.json(
      { error: "Email sending is not set up for this site yet." },
      { status: 503, headers }
    );
  }
  const recipient = client.notifyEmail ?? client.ownerEmail;
  if (!recipient) {
    return NextResponse.json(
      { error: "No recipient is set up for this site yet." },
      { status: 503, headers }
    );
  }

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Submission too large" }, { status: 413, headers });
  }
  if (await isRateLimited(`contact:${projectId}:${clientIp(req)}`)) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429, headers }
    );
  }

  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Submission too large" }, { status: 413, headers });
  }
  const parsed = bodySchema.safeParse(
    (() => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })()
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
  const data = parsed.data;

  const entries = Object.entries(data.fields)
    .map(([key, value]) => [key, value.trim()] as [string, string])
    .filter(([, value]) => value.length > 0);
  if (entries.length === 0) {
    return NextResponse.json({ error: "Empty submission" }, { status: 400, headers });
  }

  // Honeypot or a too-fast submit → quiet success, no email.
  if (data.hp || tooFast(data.t)) {
    return NextResponse.json({ ok: true }, { headers });
  }

  // Reply-To the visitor's email, and label the sender by their name if given.
  const replyTo = entries.find(
    ([key, value]) => EMAIL_KEYS.includes(key.toLowerCase()) && isEmail(value)
  )?.[1];
  const senderName = entries.find(([key]) =>
    NAME_KEYS.includes(key.toLowerCase())
  )?.[1];

  const siteName =
    hostOf(client.websiteUrl) ?? client.repo ?? client.origins?.[0] ?? "your site";
  const title = `New message from ${senderName ?? replyTo ?? siteName}`;
  const lines: [string, string][] = entries.map(([key, value]) => [
    // "full_name" → "Full name"
    key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    value,
  ]);
  if (data.pageUrl) lines.push(["Page", stripUrl(data.pageUrl) ?? data.pageUrl]);

  try {
    await usesendFetch("/api/v1/emails", {
      method: "POST",
      apiKey: client.usesendApiKey,
      body: {
        from: `${data.formName || "Contact"} <contact@${SENDING_DOMAIN}>`,
        to: recipient,
        ...(replyTo ? { replyTo } : {}),
        subject: `${data.formName ? `${data.formName}: ` : ""}${title}`,
        html: leadEmailHtml(lines, `${urls.cms}/p/${projectId}`, siteName, {
          tag: "Contact form",
          title,
        }),
        text: [
          `${title} (${siteName})`,
          "",
          ...lines.map(([label, value]) => `${label}: ${value}`),
        ].join("\n"),
      },
    });
  } catch (error) {
    console.error("Contact email send failed", error);
    return NextResponse.json(
      { error: "Could not send your message. Please try again." },
      { status: 502, headers }
    );
  }

  return NextResponse.json({ ok: true }, { headers });
}
