import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { shortLink } from "@workspace/drizzle/schema";

// Public slug resolver for the URL shortener. The agency site's on-demand
// [slug] route calls this to turn a short slug into its target URL (and count
// the click); it then issues the branded 307 on its own domain. Public + read
// only — no session needed. Returns { url } or 404 { url: null }.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [link] = await db
    .select()
    .from(shortLink)
    .where(eq(shortLink.slug, slug));

  const cors = { "Access-Control-Allow-Origin": "*" };

  if (!link) {
    return NextResponse.json({ url: null }, { status: 404, headers: cors });
  }

  await db
    .update(shortLink)
    .set({ clicks: sql`${shortLink.clicks} + 1` })
    .where(eq(shortLink.id, link.id));

  return NextResponse.json({ url: link.url }, { headers: cors });
}
