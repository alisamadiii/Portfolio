import { AwsClient } from "aws4fetch";

import type { Env } from "../env.js";

import { ApiError } from "./errors.js";

// Marketing sends go through the SES v2 JSON API instead of the v1 Query API
// (lib/ses.ts) because only v2 accepts custom headers on Simple content —
// List-Unsubscribe / List-Unsubscribe-Post (RFC 8058) are required for bulk
// mail. Same aws4fetch SigV4 signing, no SDK for the same DOMParser reason.
export async function sendMarketingViaSes(
  env: Env,
  args: {
    from: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    headers?: Record<string, string>;
    // SES configuration set routing bounce/complaint events to SNS.
    configurationSet?: string;
    // Message tags echoed back in SNS notifications (userId, campaignId).
    tags?: Record<string, string>;
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

  const body: Record<string, unknown> = {
    FromEmailAddress: args.from,
    Destination: { ToAddresses: [args.to] },
    Content: {
      Simple: {
        Subject: { Data: args.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: args.html, Charset: "UTF-8" },
          ...(args.text
            ? { Text: { Data: args.text, Charset: "UTF-8" } }
            : {}),
        },
        ...(args.headers
          ? {
              Headers: Object.entries(args.headers).map(([Name, Value]) => ({
                Name,
                Value,
              })),
            }
          : {}),
      },
    },
    ...(args.replyTo ? { ReplyToAddresses: [args.replyTo] } : {}),
    ...(args.configurationSet
      ? { ConfigurationSetName: args.configurationSet }
      : {}),
    ...(args.tags
      ? {
          EmailTags: Object.entries(args.tags).map(([Name, Value]) => ({
            Name,
            Value,
          })),
        }
      : {}),
  };

  const res = await client.fetch(
    `https://email.${region}.amazonaws.com/v2/email/outbound-emails`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const payload = (await res.json().catch(() => ({}))) as {
    MessageId?: string;
    message?: string;
    Message?: string;
  };
  if (!res.ok) {
    throw new SesSendError(
      res.status,
      payload.message ?? payload.Message ?? `SES v2 request failed (${res.status})`
    );
  }
  return payload.MessageId ?? "";
}

// Carries the raw SES status so the send workflow can tell retryable errors
// (throttling, 5xx) from permanent per-recipient failures (bad address).
export class SesSendError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "SesSendError";
  }

  get retryable(): boolean {
    return (
      this.status >= 500 ||
      this.status === 429 ||
      /throttl|too many|rate exceeded/i.test(this.message)
    );
  }
}
