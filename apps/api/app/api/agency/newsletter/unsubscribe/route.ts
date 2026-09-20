import { NextResponse } from "next/server";

import { AGENCY_SITE, setSubscription, verifyToken } from "../lib";

// ─── Unsubscribe ────────────────────────────────────────────────
// Links in broadcasts are generated with signToken(email, 0) — no
// expiry, so old emails keep working. Marks the contact unsubscribed
// in useSend (excluded from all campaigns) and shows the agency page.

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
    await setSubscription(email, false);
  } catch (error) {
    console.error("Newsletter unsubscribe failed", error);
    return NextResponse.redirect(
      `${AGENCY_SITE}/newsletter/unsubscribed?status=error`,
      302
    );
  }

  return NextResponse.redirect(`${AGENCY_SITE}/newsletter/unsubscribed`, 302);
}
