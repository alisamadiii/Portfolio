// Branded shell + personalization for marketing sends. Pure functions — the
// same inputs always produce the same HTML, so the send workflow can re-wrap
// per batch instead of reading the R2 archive back.

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Wrap composed body HTML in a table-based email shell with the CAN-SPAM
// footer (sender postal address + unsubscribe link). Rich-editor output gets
// the full shell; raw-HTML campaigns are presumed self-styled and only get
// the footer appended before </body> (or at the end when there is no body
// tag). The {{unsubscribe_url}} token survives wrapping — it is replaced
// per-recipient by personalize().
export function wrapMarketingHtml(args: {
  body: string;
  editor: "rich" | "html";
  fromName?: string | null;
  postalAddress: string;
}): string {
  const footer = `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #e5e5e5;">
    <tr>
      <td style="padding:16px 0;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:18px;color:#8a8a8a;text-align:center;">
        ${args.fromName ? `${escapeHtml(args.fromName)} &middot; ` : ""}${escapeHtml(args.postalAddress)}<br />
        <a href="{{unsubscribe_url}}" style="color:#8a8a8a;text-decoration:underline;">Unsubscribe</a>
      </td>
    </tr>
  </table>`;

  if (args.editor === "html") {
    return args.body.includes("</body>")
      ? args.body.replace("</body>", `${footer}</body>`)
      : args.body + footer;
  }

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body style="margin:0;padding:0;background-color:#f5f5f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;">
            <tr>
              <td style="padding:40px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#1a1a1a;">
                ${args.body}
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// Replace {{tokens}} with recipient values. Values are HTML-escaped —
// contact fields are user-imported data landing inside HTML.
export function personalize(
  html: string,
  recipient: { email: string; firstName?: string | null; lastName?: string | null },
  unsubUrl: string
): string {
  return html
    .replaceAll("{{unsubscribe_url}}", unsubUrl)
    .replaceAll("{{email}}", escapeHtml(recipient.email))
    .replaceAll("{{first_name}}", escapeHtml(recipient.firstName ?? ""))
    .replaceAll("{{last_name}}", escapeHtml(recipient.lastName ?? ""));
}
