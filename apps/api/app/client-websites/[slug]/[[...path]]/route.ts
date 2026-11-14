import { headers as nextHeaders } from "next/headers";

import { auth } from "@workspace/auth/auth";
import { getObject, headObject } from "@workspace/trpc/lib/client-websites";
import {
  isSafeKey,
  PRESENTATION_FILE,
  siteKey,
  SITES_PATH,
  SLUG,
} from "@workspace/trpc/lib/client-websites-shared";
import { isAdminUser } from "@workspace/trpc/lib/authz-shared";

// Streams one file of a client website design out of R2 for the hub's
// /client-websites preview iframe. Admin session only (the .alisamadii.com
// cookie rides along: hub and api are same-site). Clean URLs resolve the way a
// static host would: /about -> about.html, /services -> services/index.html.
// Root-absolute asset URLs inside designs are sent back here by proxy.ts.

// request headers forwarded to R2 / response headers passed back from it
const CONDITIONAL = ["if-none-match", "if-modified-since", "range"];
const PASS_THROUGH = ["etag", "last-modified", "content-range", "accept-ranges"];
// Decks are driven by hotkeys, so their on-screen control bar stays hidden. It
// is hidden, not removed: the deck's script looks its buttons up on load.
const DECK_STYLE = "<style>#bar{display:none!important}</style>";
// Only the hub may frame the designs.
const FRAME_ANCESTORS =
  process.env.NODE_ENV === "development"
    ? "frame-ancestors 'self' http://localhost:3007"
    : "frame-ancestors 'self' https://app.alisamadii.com";

const MIME: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/x-icon",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  pdf: "application/pdf",
  webmanifest: "application/manifest+json",
};
const mimeOf = (key: string) => MIME[/\.([a-z0-9]+)$/i.exec(key)?.[1]?.toLowerCase() ?? ""];

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

const redirect = (location: string) =>
  new Response(null, { status: 307, headers: { Location: location } });

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> }
) {
  const session = await auth.api.getSession({ headers: await nextHeaders() });
  if (!isAdminUser(session?.user)) return text("Not found", 404);

  const { slug } = await params;
  if (!SLUG.test(slug)) return text("Not found", 404);
  const { pathname, search } = new URL(req.url);
  const prefix = `${SITES_PATH}/${slug}`;
  // /client-websites/<slug> needs the trailing slash or relative links resolve wrong
  if (pathname === prefix) return redirect(`${pathname}/${search}`);

  let rest: string;
  try {
    rest = decodeURIComponent(pathname.slice(prefix.length + 1));
  } catch {
    return text("Bad path", 400);
  }
  const isDir = rest === "" || rest.endsWith("/");
  let key = siteKey(slug, rest);
  if (!isSafeKey(key)) return text("Bad path", 400);

  // The deck is rewritten below, so it always needs the full file: a 304 would
  // bring back a copy cached before the rewrite.
  const isDeck = key === `${slug}/${PRESENTATION_FILE}`;
  const forward: Record<string, string> = {};
  for (const name of isDeck ? [] : CONDITIONAL) {
    const value = req.headers.get(name);
    if (value) forward[name] = value;
  }

  let res = await getObject(key, forward);
  if (res.status === 404 && !isDir && !/\.[a-z0-9]+$/i.test(rest)) {
    await res.body?.cancel();
    res = await getObject(`${key}.html`, forward);
    if (res.status !== 404) {
      key = `${key}.html`;
    } else if ((await headObject(`${key}/index.html`)).ok) {
      await res.body?.cancel();
      return redirect(`${pathname}/${search}`);
    }
  }
  if (res.status === 404) {
    await res.body?.cancel();
    return text("Not found", 404);
  }
  if (!res.ok && res.status !== 304) {
    await res.body?.cancel();
    return text("Storage error", 502);
  }

  if (isDeck) {
    const html = await res.text();
    return new Response(html.replace(/<\/head>/i, `${DECK_STYLE}</head>`), {
      headers: {
        "Cache-Control": "private, no-cache",
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": FRAME_ANCESTORS,
      },
    });
  }

  // Extension wins over whatever content type the uploader stored.
  const out = new Headers({
    "Cache-Control": "private, no-cache",
    "Content-Type": mimeOf(key) ?? res.headers.get("content-type") ?? "application/octet-stream",
    "Content-Security-Policy": FRAME_ANCESTORS,
  });
  for (const name of PASS_THROUGH) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  // fetch already decoded an encoded body, so its stored length is wrong
  const length = res.headers.get("content-length");
  if (length && !res.headers.has("content-encoding")) out.set("Content-Length", length);
  return new Response(res.body, { status: res.status, headers: out });
}
