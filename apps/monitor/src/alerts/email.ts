import { AwsClient } from "aws4fetch";

import type { CheckResult, Recovery } from "../types.js";

// SES email goes out directly via AWS (not usesend) — usesend lives on the
// monitored VPS, so it can't be the alert channel for its own outage.
async function sendViaSes(env: Env, subject: string, html: string, text: string): Promise<void> {
  const aws = new AwsClient({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.SES_REGION,
    service: "ses",
  });
  const res = await aws.fetch(`https://email.${env.SES_REGION}.amazonaws.com/v2/email/outbound-emails`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      FromEmailAddress: env.ALERT_EMAIL_FROM,
      Destination: { ToAddresses: [env.ALERT_EMAIL_TO] },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: {
            Html: { Data: html },
            Text: { Data: text },
          },
        },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SES SendEmail HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  await res.body?.cancel();
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function failureBlock(c: CheckResult): string {
  const links: string[] = [];
  if (c.dashboardUrl) links.push(`<a href="${c.dashboardUrl}">Open in Coolify</a>`);
  if (c.url) links.push(`<a href="${c.url}">${esc(c.url)}</a>`);
  return `<div style="border-left:3px solid #c0392b;padding:8px 12px;margin:12px 0">
    <p style="margin:0 0 4px"><strong>🔴 ${esc(c.name)}</strong></p>
    <p style="margin:0 0 4px"><strong>Error:</strong> ${esc(c.detail ?? "check failed")}</p>
    ${links.length ? `<p style="margin:0 0 4px">${links.join(" &middot; ")}</p>` : ""}
    ${c.hint ? `<p style="margin:0"><strong>Fix:</strong> ${esc(c.hint)}</p>` : ""}
  </div>`;
}

export function sendDownEmail(env: Env, opened: CheckResult[]): Promise<void> {
  const html = `<h2 style="color:#c0392b">🔴 ${opened.length} check${opened.length === 1 ? "" : "s"} failing</h2>${opened
    .map(failureBlock)
    .join("")}<p style="color:#777">Checks run every 10 minutes; one alert per incident — you'll get one 🟢 email when it recovers.</p>`;
  const text = opened
    .map((c) => `DOWN ${c.name}: ${c.detail ?? "failed"}${c.dashboardUrl ? `\n  Coolify: ${c.dashboardUrl}` : ""}${c.hint ? `\n  Fix: ${c.hint}` : ""}`)
    .join("\n\n");
  return sendViaSes(env, `🔴 uptime-monitor: ${opened.length} check${opened.length === 1 ? "" : "s"} failing`, html, text);
}

export function sendRecoveredEmail(env: Env, recovered: Recovery[]): Promise<void> {
  const rows = recovered
    .map(({ check, downSince }) => `<tr><td style="padding:4px 12px 4px 0"><strong>${esc(check.name)}</strong></td><td style="padding:4px 0">down since ${esc(downSince)}</td></tr>`)
    .join("");
  const html = `<h2 style="color:#27ae60">🟢 ${recovered.length} check${recovered.length === 1 ? "" : "s"} recovered</h2><table>${rows}</table>`;
  const text = recovered.map(({ check, downSince }) => `RECOVERED ${check.name} (down since ${downSince})`).join("\n");
  return sendViaSes(env, `🟢 uptime-monitor: ${recovered.length} check${recovered.length === 1 ? "" : "s"} recovered`, html, text);
}
