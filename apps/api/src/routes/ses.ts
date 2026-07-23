import { AwsClient } from "aws4fetch";
import { Hono } from "hono";

import type { Env } from "../env.js";
import { ApiError } from "../lib/errors.js";
import type { AppEnv } from "../middleware/auth.js";

// SES's SDK selects a browser build on Workers that needs DOMParser (absent in
// the runtime), so we hit the SES Query API (2010-12-01) directly with
// aws4fetch SigV4 signing and parse the XML by hand — same approach as the
// send path in routes/emails.ts.
function sesClient(env: Env): { client: AwsClient; endpoint: string } {
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
  return { client, endpoint: `https://email.${region}.amazonaws.com/` };
}

// POST a form-encoded SES Query action; return the raw XML body or throw.
async function sesQuery(
  env: Env,
  params: Record<string, string>
): Promise<string> {
  const { client, endpoint } = sesClient(env);
  const res = await client.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  const text = await res.text();
  if (!res.ok) {
    const msg =
      /<Message>([\s\S]*?)<\/Message>/.exec(text)?.[1] ??
      `Email provider request failed (${res.status})`;
    throw new ApiError(
      502,
      "EMAIL_PROVIDER_ERROR",
      msg,
      "AWS SES rejected the request. The message above is SES's own error."
    );
  }
  return text;
}

// ── XML helpers ────────────────────────────────────────────────────────────────

// Pull <member>…</member> values from the first <tag>…</tag> block.
function parseMembers(xml: string, tag: string): string[] {
  const block =
    new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml)?.[1] ?? "";
  return [...block.matchAll(/<member>(.*?)<\/member>/g)].map((m) => m[1]);
}

// Parse SES map results (<entry><key/><value/></entry>) into key → value-XML.
function parseEntries(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const key = /<key>(.*?)<\/key>/.exec(m[1])?.[1];
    const value = /<value>([\s\S]*?)<\/value>/.exec(m[1])?.[1] ?? "";
    if (key) out[key] = value;
  }
  return out;
}

function tag(xml: string, name: string): string | undefined {
  return new RegExp(`<${name}>(.*?)</${name}>`).exec(xml)?.[1];
}

// ── Health / status (read-only) ───────────────────────────────────────────────

export type EmailHealth = {
  account: {
    sendingEnabled: boolean;
    productionAccess: boolean; // false = sandbox
    max24HourSend: number;
    maxSendRate: number;
    sentLast24Hours: number;
  };
  identities: {
    identity: string;
    type: "email" | "domain";
    verificationStatus: string;
    dkimEnabled?: boolean;
    dkimStatus?: string;
  }[];
  statistics: {
    timestamp: string;
    deliveryAttempts: number;
    bounces: number;
    complaints: number;
    rejects: number;
  }[];
};

// Aggregate the SES account/identity/DKIM/statistics reads into a single shape.
async function getEmailHealth(env: Env): Promise<EmailHealth> {
  const [enabledXml, quotaXml, emailXml, domainXml] = await Promise.all([
    sesQuery(env, { Action: "GetAccountSendingEnabled" }),
    sesQuery(env, { Action: "GetSendQuota" }),
    sesQuery(env, {
      Action: "ListIdentities",
      IdentityType: "EmailAddress",
      MaxItems: "100",
    }),
    sesQuery(env, {
      Action: "ListIdentities",
      IdentityType: "Domain",
      MaxItems: "100",
    }),
  ]);

  const emails = parseMembers(emailXml, "Identities");
  const domains = parseMembers(domainXml, "Identities");
  const all = [...emails, ...domains];

  const verParams: Record<string, string> = {
    Action: "GetIdentityVerificationAttributes",
  };
  all.forEach((id, i) => {
    verParams[`Identities.member.${i + 1}`] = id;
  });
  const dkimParams: Record<string, string> = {
    Action: "GetIdentityDkimAttributes",
  };
  domains.forEach((id, i) => {
    dkimParams[`Identities.member.${i + 1}`] = id;
  });

  const [verXml, dkimXml, statsXml] = await Promise.all([
    all.length ? sesQuery(env, verParams) : Promise.resolve(""),
    domains.length ? sesQuery(env, dkimParams) : Promise.resolve(""),
    sesQuery(env, { Action: "GetSendStatistics" }),
  ]);

  const verMap = parseEntries(verXml);
  const dkimMap = parseEntries(dkimXml);

  const identities: EmailHealth["identities"] = all.map((identity) => {
    const isDomain = domains.includes(identity);
    return {
      identity,
      type: isDomain ? ("domain" as const) : ("email" as const),
      verificationStatus:
        tag(verMap[identity] ?? "", "VerificationStatus") ?? "Unknown",
      ...(isDomain
        ? {
            dkimEnabled: tag(dkimMap[identity] ?? "", "DkimEnabled") === "true",
            dkimStatus:
              tag(dkimMap[identity] ?? "", "DkimVerificationStatus") ??
              "Unknown",
          }
        : {}),
    };
  });

  const max24HourSend = Number(tag(quotaXml, "Max24HourSend") ?? "0");
  const statsBlock =
    /<SendDataPoints>([\s\S]*?)<\/SendDataPoints>/.exec(statsXml)?.[1] ?? "";
  const statistics = [...statsBlock.matchAll(/<member>([\s\S]*?)<\/member>/g)]
    .map((m) => ({
      timestamp: tag(m[1], "Timestamp") ?? "",
      deliveryAttempts: Number(tag(m[1], "DeliveryAttempts") ?? "0"),
      bounces: Number(tag(m[1], "Bounces") ?? "0"),
      complaints: Number(tag(m[1], "Complaints") ?? "0"),
      rejects: Number(tag(m[1], "Rejects") ?? "0"),
    }))
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .slice(0, 14);

  return {
    account: {
      sendingEnabled: tag(enabledXml, "Enabled") === "true",
      productionAccess: max24HourSend > 200, // <=200 => SES sandbox
      max24HourSend,
      maxSendRate: Number(tag(quotaXml, "MaxSendRate") ?? "0"),
      sentLast24Hours: Number(tag(quotaXml, "SentLast24Hours") ?? "0"),
    },
    identities,
    statistics,
  };
}

// Guarded by requireAdmin on the /v1/admin group in app.ts.
export const ses = new Hono<AppEnv>();

ses.get("/", async (c) => c.json(await getEmailHealth(c.env)));
