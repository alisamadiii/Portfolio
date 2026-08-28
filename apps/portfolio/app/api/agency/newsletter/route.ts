import { NextResponse } from "next/server";
import { z } from "zod";

import { API_SITE, corsHeaders, FROM, getResend, signToken } from "./lib";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 200, headers: corsHeaders(req) });
}

// ─── Rate limit ─────────────────────────────────────────────────
// Public endpoint that triggers an outbound email — guard per IP.
// In-memory: best effort per serverless instance (same as quote route).

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const hits = new Map<string, number[]>();

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
};

// ─── Subscribe (step 1 of double opt-in) ────────────────────────
// Sends a confirmation email with a signed link; the contact is only
// added to the Resend segment when they click it (confirm route).

const CONFIRM_TTL_MS = 24 * 60 * 60 * 1000; // 24h

const bodySchema = z.object({
  email: z.email(),
  /** Honeypot — real users never fill this. */
  company: z.string().optional(),
});

const confirmEmailHtml = (confirmUrl: string) => `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f4f1;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #eceae6;">
            <tr>
              <td style="padding:32px 32px 0;">
                <div style="font:600 11px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:0.12em;text-transform:uppercase;color:#fc8464;">
                  &#9642; Newsletter
                </div>
                <div style="margin-top:12px;font:600 24px/1.25 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-0.02em;color:#2b2926;">
                  Confirm your subscription
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0;">
                <div style="font:400 15px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#67625a;">
                  One click and you're in — new launches, client showcases,
                  product updates, and lessons from running the studio.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 0;">
                <a href="${confirmUrl}" style="display:inline-block;background:#2b2926;color:#faf6f2;font:500 15px/1 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:15px 30px;border-radius:999px;text-decoration:none;">Confirm subscription</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <div style="font:400 12.5px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#a49d94;">
                  Button not working? Paste this link into your browser:<br />
                  <a href="${confirmUrl}" style="color:#fc8464;word-break:break-all;">${confirmUrl}</a>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 28px;">
                <div style="border-top:1px solid #f1efec;padding-top:16px;font:400 12px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#a49d94;">
                  Didn't sign up? You can safely ignore this email — nothing
                  will be sent unless you confirm. &middot; agency.alisamadii.com
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const confirmEmailText = (confirmUrl: string) =>
  [
    `Confirm your subscription`,
    ``,
    `One click and you're in — new launches, client showcases, product`,
    `updates, and lessons from running the studio.`,
    ``,
    `Confirm: ${confirmUrl}`,
    ``,
    `Didn't sign up? Ignore this email — nothing will be sent unless you confirm.`,
  ].join("\n");

export async function POST(req: Request) {
  const headers = corsHeaders(req);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests — try again in a few minutes." },
      { status: 429, headers }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400, headers }
    );
  }

  // Honeypot hit → pretend success, send nothing.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true }, { headers });
  }

  const email = parsed.data.email.toLowerCase();
  const token = signToken(email, CONFIRM_TTL_MS);
  const confirmUrl = `${API_SITE}/api/agency/newsletter/confirm?token=${encodeURIComponent(token)}`;

  try {
    const { error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: "Confirm your subscription — Ali Samadi Agency",
      html: confirmEmailHtml(confirmUrl),
      text: confirmEmailText(confirmUrl),
    });
    if (error) throw error;
  } catch (error) {
    console.error("Newsletter confirmation email failed", error);
    return NextResponse.json(
      { error: "Couldn't send the confirmation email — try again shortly." },
      { status: 500, headers }
    );
  }

  return NextResponse.json({ ok: true }, { headers });
}
