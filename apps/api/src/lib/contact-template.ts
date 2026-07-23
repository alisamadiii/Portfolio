// Server-rendered HTML for contact-form notifications (POST /v1/emails/contact).
// Table-based layout so it renders in Gmail/Outlook; all user-supplied fields
// are HTML-escaped before interpolation.

export type ContactEmailArgs = {
  name: string;
  email: string;
  subject: string;
  message: string;
  source: string;
  device: string;
  ip: string;
  date: Date;
  // Client-specific extra form fields, rendered as a Details section.
  metadata?: Record<string, string | number | boolean>;
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

export function renderContactEmail(args: ContactEmailArgs): {
  html: string;
  text: string;
} {
  const name = escapeHtml(args.name);
  const email = escapeHtml(args.email);
  const subject = escapeHtml(args.subject);
  const message = escapeHtml(args.message);
  const source = escapeHtml(args.source);
  const device = escapeHtml(args.device || "Unknown");
  const ip = escapeHtml(args.ip || "Unknown");
  const date = formatDate(args.date);
  const initial = escapeHtml((args.name.trim()[0] ?? "?").toUpperCase());
  const firstName = escapeHtml(args.name.trim().split(/\s+/)[0] ?? "sender");
  const replyHref = `mailto:${email}?subject=${encodeURIComponent(`Re: ${args.subject}`).replace(/%20/g, "+")}`;

  const metaEntries = Object.entries(args.metadata ?? {});
  const detailsHtml = metaEntries.length
    ? `<p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Details</p>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px"><tbody><tr><td style="padding:16px">
<table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
${metaEntries
  .map(
    ([k, v], i) =>
      `<tr><td style="font-size:13px;color:#6b7280;${i < metaEntries.length - 1 ? "padding-bottom:6px;" : ""}width:140px;vertical-align:top">${escapeHtml(k)}:</td><td style="font-size:13px;color:#111827;${i < metaEntries.length - 1 ? "padding-bottom:6px;" : ""}white-space:pre-wrap">${escapeHtml(String(v))}</td></tr>`
  )
  .join("\n")}
</tbody></table>
</td></tr></tbody></table>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background-color:#ffffff;margin:0;padding:0">
<table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center" style="width:100%"><tbody><tr>
<td style="background-color:#ffffff;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${subject} — ${name}</div>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;margin:0 auto"><tbody><tr style="width:100%"><td>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#2563eb;height:4px;width:100%"><tbody><tr><td></td></tr></tbody></table>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr><td style="padding:32px 32px 0">
<table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
<td style="width:52px;vertical-align:top"><div style="width:48px;height:48px;border-radius:50%;background-color:#2563eb;color:#ffffff;font-size:20px;font-weight:700;line-height:48px;text-align:center">${initial}</div></td>
<td style="vertical-align:top;padding-left:12px">
<p style="font-size:18px;line-height:24px;margin:0;font-weight:700;color:#111827">${name}</p>
<a href="mailto:${email}" style="color:#2563eb;font-size:14px;text-decoration:none">${email}</a>
</td></tr></tbody></table>
</td></tr></tbody></table>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr><td style="padding:20px 32px 0">
<table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
<tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px;width:100px">Date:</td><td style="font-size:13px;color:#111827;padding-bottom:6px">${date}</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px">Source:</td><td style="font-size:13px;color:#111827;padding-bottom:6px">${source}</td></tr>
<tr><td style="font-size:13px;color:#6b7280;padding-bottom:6px">Device:</td><td style="font-size:13px;color:#111827;padding-bottom:6px">${device}</td></tr>
<tr><td style="font-size:13px;color:#6b7280">IP Address:</td><td style="font-size:13px;color:#111827">${ip}</td></tr>
</tbody></table>
</td></tr></tbody></table>
<hr style="width:100%;border:none;border-top:1px solid #e5e7eb;margin:24px 32px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr><td style="padding:0 32px">
<p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Subject</p>
<p style="font-size:16px;line-height:24px;font-weight:600;color:#111827;margin:0 0 24px">${subject}</p>
<p style="font-size:12px;line-height:24px;color:#6b7280;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em">Message</p>
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background-color:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:24px"><tbody><tr><td style="padding:16px">
<p style="font-size:14px;line-height:22px;color:#1e293b;margin:0;white-space:pre-wrap">${message}</p>
</td></tr></tbody></table>
${detailsHtml}
</td></tr></tbody></table>
<hr style="width:100%;border:none;border-top:1px solid #e5e7eb;margin:0 32px 24px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr><td style="padding:0 32px 32px">
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="width:100%"><tbody><tr>
<td style="background-color:#2563eb;border-radius:8px;text-align:center;padding:14px 24px">
<a href="${replyHref}" style="color:#ffffff;display:block;font-size:14px;font-weight:600;text-decoration:none">Reply to ${firstName}</a>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</td></tr></tbody></table>
</body>
</html>`;

  const text = [
    `${args.name} <${args.email}>`,
    "",
    `Date: ${date}`,
    `Source: ${args.source}`,
    `Device: ${args.device || "Unknown"}`,
    `IP Address: ${args.ip || "Unknown"}`,
    "",
    `Subject: ${args.subject}`,
    "",
    args.message,
    ...(metaEntries.length
      ? ["", "Details:", ...metaEntries.map(([k, v]) => `${k}: ${String(v)}`)]
      : []),
  ].join("\n");

  return { html, text };
}
