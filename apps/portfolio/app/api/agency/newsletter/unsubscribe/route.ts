import { NextResponse } from "next/server";

import { AGENCY_SITE, getResend, verifyToken } from "../lib";

// ─── Unsubscribe ────────────────────────────────────────────────
// Links in broadcasts are generated with signToken(email, 0) — no
// expiry, so old emails keep working. Marks the contact unsubscribed
// in Resend (excluded from all broadcasts) and shows the agency page.

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const email = verifyToken(token);

  if (!email) {
    return NextResponse.redirect(
      `${AGENCY_SITE}/newsletter/unsubscribed?status=invalid`,
      302
    );
  }

  try {
    const { error } = await getResend().contacts.update({
      email,
      unsubscribed: true,
    });
    if (error) throw error;
  } catch (error) {
    console.error("Newsletter unsubscribe failed", error);
    return NextResponse.redirect(
      `${AGENCY_SITE}/newsletter/unsubscribed?status=error`,
      302
    );
  }

  return NextResponse.redirect(`${AGENCY_SITE}/newsletter/unsubscribed`, 302);
}
