import { AwsClient } from "aws4fetch";

import { SES_QUOTA_ALERT_RATIO } from "../config.js";
import type { CheckResult } from "../types.js";

interface SesAccount {
  SendingEnabled?: boolean;
  EnforcementStatus?: string;
  SendQuota?: {
    Max24HourSend?: number;
    SentLast24Hours?: number;
  };
}

// SESv2 GetAccount — catches the failure mode uptime pings can't: usesend is
// up but AWS paused sending (reputation) or the 24h quota is nearly burned.
export async function checkSes(env: Env): Promise<CheckResult> {
  const id = "ses:account";
  const consoleUrl = `https://${env.SES_REGION}.console.aws.amazon.com/ses/home?region=${env.SES_REGION}#/account`;
  try {
    const aws = new AwsClient({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.SES_REGION,
      service: "ses",
    });
    const res = await aws.fetch(`https://email.${env.SES_REGION}.amazonaws.com/v2/email/account`, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text();
      return {
        id,
        name: "AWS SES",
        ok: false,
        detail: `GetAccount HTTP ${res.status}: ${body.slice(0, 200)}`,
        url: consoleUrl,
        hint: "GetAccount call failed — usually bad/rotated AWS keys or IAM policy missing ses:GetAccount.",
      };
    }
    const account = (await res.json()) as SesAccount;

    const sent = account.SendQuota?.SentLast24Hours ?? 0;
    const max = account.SendQuota?.Max24HourSend ?? 0;
    const quotaRatio = max > 0 ? sent / max : 0;
    const detail = `sending=${account.SendingEnabled}, enforcement=${account.EnforcementStatus ?? "n/a"}, quota ${sent}/${max} (${Math.round(quotaRatio * 100)}%)`;

    if (account.SendingEnabled === false) {
      return {
        id,
        name: "AWS SES",
        ok: false,
        detail: `SENDING PAUSED — ${detail}`,
        url: consoleUrl,
        hint: "AWS paused sending (usually bounce/complaint rate). Check SES console → Account dashboard → reputation metrics; open an AWS support case to re-enable.",
      };
    }
    if (quotaRatio >= SES_QUOTA_ALERT_RATIO) {
      return {
        id,
        name: "AWS SES",
        ok: false,
        detail: `quota nearly exhausted — ${detail}`,
        url: consoleUrl,
        hint: "24h send quota nearly used up — pause campaigns in usesend or request a quota increase in the SES console.",
      };
    }
    return { id, name: "AWS SES", ok: true, detail, url: consoleUrl };
  } catch (err) {
    return {
      id,
      name: "AWS SES",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      url: consoleUrl,
      hint: "Couldn't reach the SES API — likely transient AWS/network issue; recheck next run.",
    };
  }
}
