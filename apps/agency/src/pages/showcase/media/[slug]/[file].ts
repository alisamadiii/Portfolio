import type { APIRoute } from "astro";

import { getMedia, MEDIA_FILES, type MediaFile } from "../../../../lib/showcase";

// Showcase video + poster, streamed out of the private client-websites bucket.
// Only the two whitelisted files exist here: a site's HTML is never served.
export const prerender = false;

const FORWARDED = ["range", "if-none-match", "if-modified-since", "if-range"];
const PASSED = [
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

const isMediaFile = (file: string | undefined): file is MediaFile =>
  !!file && Object.hasOwn(MEDIA_FILES, file);

export const GET: APIRoute = async ({ params, request }) => {
  const { slug = "", file } = params;
  if (!isMediaFile(file)) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {};
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  const res = await getMedia(slug, file, headers);
  if (!res) return new Response("Not found", { status: 404 });
  if (!res.ok && res.status !== 304) {
    await res.body?.cancel();
    return new Response(res.status === 416 ? "Range not satisfiable" : "Not found", {
      status: res.status === 416 ? 416 : 404,
    });
  }

  const out = new Headers({
    "content-type": MEDIA_FILES[file],
    "cache-control": "public, max-age=3600",
    "accept-ranges": "bytes",
  });
  for (const name of PASSED) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(res.body, { status: res.status, headers: out });
};
