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

export const GET: APIRoute = async ({ params, redirect, rewrite }) => {
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
      // fall through to the 404 page on any resolver error
    }
  }
  // Unknown slug → real 404 page (redirecting home made every bad URL a
  // soft 404 for crawlers); the 404 page links back home.
  return rewrite("/404");
};
