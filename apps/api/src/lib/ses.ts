import { AwsClient } from "aws4fetch";

import type { Env } from "../env.js";

import { ApiError } from "./errors.js";

export interface RawAttachment {
  filename: string;
  /** File bytes, base64-encoded. */
  content: string;
  contentType?: string;
}

// btoa only handles latin1, and String.fromCharCode.apply over a whole large
// array overflows the call stack — so encode the bytes in fixed chunks.
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// base64 wants 76-char lines (RFC 2045); attachment content arrives as one long
// base64 string, so re-wrap it.
function wrap76(b64: string): string {
  return b64.replace(/.{76}/g, "$&\r\n");
}

const b64 = (s: string): string => bytesToBase64(new TextEncoder().encode(s));

// Build a MIME multipart message for SES SendRawEmail. html/text are
// base64-encoded so UTF-8 bodies survive; attachment content is already base64.
// Boundaries are index-based (no randomness) so the output is deterministic.
export function buildRawEmail(args: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments: RawAttachment[];
}): string {
  const mixed = "=_mixed_boundary_0";
  const alt = "=_alt_boundary_0";

  // Encode the subject as an RFC 2047 word so non-ASCII survives the header.
  const headers = [
    `From: ${args.from}`,
    `To: ${args.to.join(", ")}`,
    ...(args.replyTo ? [`Reply-To: ${args.replyTo}`] : []),
    `Subject: =?UTF-8?B?${b64(args.subject)}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixed}"`,
  ];

  const altPart: string[] = [
    `--${mixed}`,
    `Content-Type: multipart/alternative; boundary="${alt}"`,
    "",
  ];
  if (args.text) {
    altPart.push(
      `--${alt}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(b64(args.text)),
      ""
    );
  }
  altPart.push(
    `--${alt}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrap76(b64(args.html)),
    "",
    `--${alt}--`,
    ""
  );

  const attachmentParts = args.attachments.flatMap((a) => {
    const type = a.contentType || "application/octet-stream";
    const name = a.filename.replace(/["\r\n]/g, "");
    return [
      `--${mixed}`,
      `Content-Type: ${type}; name="${name}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${name}"`,
      "",
      wrap76(a.content),
      "",
    ];
  });

  return [
    ...headers,
    "",
    ...altPart,
    ...attachmentParts,
    `--${mixed}--`,
    "",
  ].join("\r\n");
}

// SES's SDK selects a browser build on Workers that needs DOMParser (absent in
// the runtime), so we hit the SES Query API (2010-12-01) directly with
// aws4fetch SigV4 signing and parse the XML by hand.
export async function sendViaSes(
  env: Env,
  args: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    attachments?: RawAttachment[];
  }
): Promise<string> {
  if (!env.AWS_ACCESS_KEY_VALUE || !env.AWS_SECRET_KEY_VALUE) {
    throw new ApiError(
      500,
      "EMAIL_NOT_CONFIGURED",
      "SES credentials not configured on the server.",
      "Set AWS_ACCESS_KEY_VALUE / AWS_SECRET_KEY_VALUE (.dev.vars locally)."
    );
  }
  const region = env.AWS_BUCKET_ORIGIN || "us-east-1";
  const client = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_VALUE,
    secretAccessKey: env.AWS_SECRET_KEY_VALUE,
    service: "ses",
    region,
  });

  const params: Record<string, string> = {};
  if (args.attachments && args.attachments.length > 0) {
    // SendEmail can't carry attachments — send a hand-built MIME message via
    // SendRawEmail instead. From/To/Reply-To live inside the raw headers.
    const raw = buildRawEmail({
      from: args.from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
      attachments: args.attachments,
    });
    params.Action = "SendRawEmail";
    params.Source = args.from;
    args.to.forEach((addr, i) => {
      params[`Destinations.member.${i + 1}`] = addr;
    });
    params["RawMessage.Data"] = bytesToBase64(new TextEncoder().encode(raw));
  } else {
    params.Action = "SendEmail";
    params.Source = args.from;
    params["Message.Subject.Data"] = args.subject;
    params["Message.Subject.Charset"] = "UTF-8";
    params["Message.Body.Html.Data"] = args.html;
    params["Message.Body.Html.Charset"] = "UTF-8";
    args.to.forEach((addr, i) => {
      params[`Destination.ToAddresses.member.${i + 1}`] = addr;
    });
    if (args.text) {
      params["Message.Body.Text.Data"] = args.text;
      params["Message.Body.Text.Charset"] = "UTF-8";
    }
    if (args.replyTo) {
      params["ReplyToAddresses.member.1"] = args.replyTo;
    }
  }

  const res = await client.fetch(`https://email.${region}.amazonaws.com/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const xml = await res.text();
  if (!res.ok) {
    const msg =
      /<Message>([\s\S]*?)<\/Message>/.exec(xml)?.[1] ??
      `Email provider request failed (${res.status})`;
    throw new ApiError(
      502,
      "EMAIL_PROVIDER_ERROR",
      msg,
      "AWS SES rejected the send. The message above is SES's own error."
    );
  }
  return /<MessageId>(.*?)<\/MessageId>/.exec(xml)?.[1] ?? "";
}
