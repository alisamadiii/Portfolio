import { notFound, redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { shortLink } from "@workspace/drizzle/schema";

// URL shortener: www.alisamadii.com/<slug> → stored target URL.
// 307 (redirect()) on purpose — browsers hard-cache 301s and clicks
// would stop counting.

export default async function ShortLinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [link] = await db
    .select()
    .from(shortLink)
    .where(eq(shortLink.slug, slug));

  if (!link) notFound();

  await db
    .update(shortLink)
    .set({ clicks: sql`${shortLink.clicks} + 1` })
    .where(eq(shortLink.id, link.id));

  redirect(link.url);
}
