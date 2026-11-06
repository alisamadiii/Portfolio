import type { APIRoute } from "astro";

import { getPresentation, getShowcase } from "../../../lib/showcase";

// A project's walkthrough deck (presentation.html), opened full page from the
// showcase project's Presentation button.
export const prerender = false;

export const GET: APIRoute = async ({ params, rewrite }) => {
  const slug = params.slug ?? "";
  const project = await getShowcase(slug);
  const html = project?.hasPresentation ? await getPresentation(slug) : null;
  if (!html) return rewrite("/404");
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
