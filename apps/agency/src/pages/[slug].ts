import type { APIRoute } from "astro";

// URL shortener: alisamadii.com/<slug> → stored target URL. On-demand (not
// prerendered) so it can resolve the slug at request time. Static pages
// (/about, /pricing, …) take route priority over this dynamic catch-all, so it
// only fires for otherwise-unmatched single-segment paths. The DB lives in the
// api app; this route asks it to resolve + count the click, then issues the
// branded 307 on the agency domain. 307 (not 301): browsers hard-cache 301s and
// clicks would stop counting.
export const prerender = false;

const API_URL = process.env.API_URL ?? "https://api.alisamadii.com";

export const GET: APIRoute = async ({ params, redirect }) => {
  const slug = params.slug;
  if (slug) {
    try {
      const res = await fetch(
        `${API_URL}/api/links/resolve/${encodeURIComponent(slug)}`
      );
      if (res.ok) {
        const { url } = (await res.json()) as { url: string | null };
        if (url) return redirect(url, 307);
      }
    } catch {
      // fall through to home on any resolver error
    }
  }
  // Unknown slug → home, keeps mistyped links from dead-ending.
  return redirect("/", 302);
};
