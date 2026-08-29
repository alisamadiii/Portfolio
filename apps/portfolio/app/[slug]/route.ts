import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { shortLink } from "@workspace/drizzle/schema";

// URL shortener: www.alisamadii.com/<slug> → stored target URL.
// Route handler, NOT a page — a server page streams the layout shell before
// redirect() executes, flashing the site for a second. The handler sends the
// redirect header before any HTML. 307 on purpose: browsers hard-cache 301s
// and clicks would stop counting.

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const [link] = await db
    .select()
    .from(shortLink)
    .where(eq(shortLink.slug, slug));

  // Unknown slug → home, keeps mistyped links from dead-ending.
  if (!link) return NextResponse.redirect(new URL("/", req.url), 302);

  await db
    .update(shortLink)
    .set({ clicks: sql`${shortLink.clicks} + 1` })
    .where(eq(shortLink.id, link.id));

  return NextResponse.redirect(link.url, 307);
}
