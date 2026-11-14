import { SITES_PATH, sitePagePath } from "@workspace/trpc/lib/client-websites-shared";

// The api serves design files (admin session, same-site cookie), so the
// preview iframes point at it, not at the hub.
const API = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** Absolute URL of one page of a design (index.html pages by their folder). */
export const siteUrl = (slug: string, page = "index.html") => `${API}${sitePagePath(slug, page)}`;

/** Absolute URL of any file in a design's folder (preview.mp4, …). */
export const siteFileUrl = (slug: string, file: string) => `${API}${SITES_PATH}/${slug}/${file}`;

export const formatDate = (value: string | null) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};
