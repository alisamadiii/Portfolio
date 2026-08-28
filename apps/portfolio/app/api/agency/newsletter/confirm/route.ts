import { NextResponse } from "next/server";

import { AGENCY_SITE, getResend, SEGMENT_ID, verifyToken } from "../lib";

// ─── Confirm (step 2 of double opt-in) ──────────────────────────
// Human clicks the link from the confirmation email. Valid token →
// contact created in the newsletter segment → agency thank-you page.
// Idempotent: an existing contact is resubscribed instead of erroring.

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
    const resend = getResend();
    const { error } = await resend.contacts.create({
      email,
      unsubscribed: false,
      segments: [{ id: SEGMENT_ID }],
    });

    if (error) {
      // Already a contact (re-click / resubscribe) → flip unsubscribed off.
      const { error: updateError } = await resend.contacts.update({
        email,
        unsubscribed: false,
      });
      if (updateError)
        throw new Error(`${error.message} / ${updateError.message}`);
    }
  } catch (error) {
    console.error("Newsletter confirm failed", error);
    return NextResponse.redirect(
      `${AGENCY_SITE}/newsletter/thank-you?status=error`,
      302
    );
  }

  return NextResponse.redirect(`${AGENCY_SITE}/newsletter/thank-you`, 302);
}
