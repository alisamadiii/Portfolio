// Server-rendered HTML for health-cron alert emails (src/scheduled.ts).
// Same table-based, inline-styled layout as contact-template.ts so it renders
// in Gmail/Outlook.

import type { HealthResult } from "./health.js";

const CHECK_LABELS: Record<string, string> = {
  db: "Database (Neon)",
  kv: "Workers KV",
  ses: "Email (AWS SES)",
  r2: "Storage (R2)",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(date: Date): string {
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return `${day} at ${time}`;
}

function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "less than a minute";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h}h ${min % 60}m`;
}

export function renderHealthAlertEmail(args: {
  kind: "down" | "recovered";
  result: HealthResult;
  downSince?: string; // ISO timestamp of the run that opened the incident
}): { html: string; text: string } {
  const down = args.kind === "down";
  const accent = down ? "#dc2626" : "#16a34a";
  const title = down ? "Health check failed" : "All systems recovered";
  const failed = Object.entries(args.result.checks).filter(([, c]) => !c.ok);
  const subtitle = down
    ? `${failed.length} of ${Object.keys(args.result.checks).length} checks failing`
    : "Every dependency is answering again";
  const when = formatDate(new Date(args.result.timestamp));

  const rows = Object.entries(args.result.checks)
    .map(([name, c], i, arr) => {
      const label = escapeHtml(CHECK_LABELS[name] ?? name);
      const pill = c.ok
        ? `<span style="display:inline-block;background-color:#dcfce7;color:#166534;font-size:11px;font-weight:700;border-radius:9999px;padding:2px 10px;letter-spacing:0.03em">OK</span>`
        : `<span style="display:inline-block;background-color:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;border-radius:9999px;padding:2px 10px;letter-spacing:0.03em">FAIL</span>`;
      const border =
        i < arr.length - 1 ? "border-bottom:1px solid #e2e8f0;" : "";
      const error = c.error
        ? `<p style="font-size:12px;line-height:18px;color:#991b1b;margin:4px 0 0">${escapeHtml(c.error)}</p>`
        : "";
      return `<tr>
<td style="${border}padding:12px 16px">
<p style="font-size:14px;font-weight:600;color:#111827;margin:0">${label}</p>${error}
</td>
<td style="${border}padding:12px 16px;text-align:right;white-space:nowrap;vertical-align:top">
<span style="font-size:12px;color:#6b7280;padding-right:8px">${c.latencyMs}ms</span>${pill}
</td></tr>`;
    })
    .join("\n");

  const incidentHtml =
    !down && args.downSince
      ? `<table cellpadding="0" cellspacing="0" style="width:100%;margin-top:16px"><tbody>
<tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px;width:120px">Down since:</td><td style="font-size:13px;color:#111827;padding-bottom:6px">${formatDate(new Date(args.downSince))}</td></tr>
<tr><td style="font-size:13px;color:#6b7280">Downtime:</td><td style="font-size:13px;color:#111827">${formatDuration(Date.parse(args.result.timestamp) - Date.parse(args.downSince))}</td></tr>
</tbody></table>`
      : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background-color:#ffffff;margin:0;padding:0">
<table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:100%"><tbody><tr>
<td style="background-color:#ffffff;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${title} — agency-api</div>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;margin:0 auto"><tbody><tr style="width:100%"><td>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${accent};height:4px;width:100%"><tbody><tr><td></td></tr></tbody></table>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr><td style="padding:32px 32px 0">
<p style="font-size:12px;line-height:16px;color:#6b7280;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em">agency-api monitoring</p>
<p style="font-size:22px;line-height:28px;margin:0;font-weight:700;color:${accent}">${title}</p>
<p style="font-size:14px;line-height:20px;color:#6b7280;margin:8px 0 0">${subtitle} &middot; ${when}</p>
${incidentHtml}
</td></tr></tbody></table>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr><td style="padding:24px 32px 0">
<p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Checks</p>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0"><tbody>
${rows}
</tbody></table>
</td></tr></tbody></table>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr><td style="padding:24px 32px 32px">
<p style="font-size:12px;line-height:18px;color:#9ca3af;margin:0">Sent by the agency-api health cron (every 10 minutes). One email per incident — you'll get a recovery notice when checks pass again.</p>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</body>
</html>`;

  const text = [
    `${title} — agency-api`,
    `${subtitle} · ${when}`,
    ...(args.downSince && !down
      ? [
          `Down since: ${formatDate(new Date(args.downSince))}`,
          `Downtime: ${formatDuration(Date.parse(args.result.timestamp) - Date.parse(args.downSince))}`,
        ]
      : []),
    "",
    ...Object.entries(args.result.checks).map(
      ([name, c]) =>
        `${c.ok ? "OK  " : "FAIL"} ${CHECK_LABELS[name] ?? name} (${c.latencyMs}ms)${c.error ? ` — ${c.error}` : ""}`
    ),
  ].join("\n");

  return { html, text };
}
