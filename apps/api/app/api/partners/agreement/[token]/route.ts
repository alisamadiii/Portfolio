import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@workspace/drizzle/index";
import { partner } from "@workspace/drizzle/schema";
import { presignPrivateGet } from "@workspace/trpc/lib/r2";

// Signed partner agreement download. The token is the unguessable
// partner.pdfToken; the file sits in the private R2 bucket and is only
// reachable through this short-lived presigned redirect.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [row] = await db
    .select({ key: partner.agreementKey })
    .from(partner)
    .where(eq(partner.pdfToken, token))
    .limit(1);
  if (!row?.key) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = await presignPrivateGet(row.key, {
    expiresIn: 300,
    filename: "partner-agreement.pdf",
  });
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
