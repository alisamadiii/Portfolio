import { AwsClient } from "aws4fetch";

import type { Env } from "../env.js";

import { ApiError } from "./errors.js";

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

  const params: Record<string, string> = {
    Action: "SendEmail",
    Source: args.from,
    "Message.Subject.Data": args.subject,
    "Message.Subject.Charset": "UTF-8",
    "Message.Body.Html.Data": args.html,
    "Message.Body.Html.Charset": "UTF-8",
  };
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
