import { NextResponse } from "next/server";

import { AGENCY_SITE, setSubscription, verifyToken } from "../lib";

// ─── Confirm (step 2 of double opt-in) ──────────────────────────
// Human clicks the link from the confirmation email. Valid token →
// contact upserted into the newsletter contact book → agency thank-you
// page. Idempotent: an existing contact is resubscribed instead of
// erroring.

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const email = verifyToken(token);

  if (!email) {
    return NextResponse.redirect(
      `${AGENCY_SITE}/newsletter/thank-you?status=invalid`,
      302
    );
  }

  try {
    await setSubscription(email, true);
  } catch (error) {
    console.error("Newsletter confirm failed", error);
    return NextResponse.redirect(
      `${AGENCY_SITE}/newsletter/thank-you?status=error`,
      302
    );
  }

  return NextResponse.redirect(`${AGENCY_SITE}/newsletter/thank-you`, 302);
}
