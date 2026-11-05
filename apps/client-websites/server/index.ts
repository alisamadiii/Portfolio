import { existsSync, readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono, type Context } from "hono";
import { basicAuth } from "hono/basic-auth";
import { HTTPException } from "hono/http-exception";
import { getMimeType } from "hono/utils/mime";
import Stripe from "stripe";

import {
  metaSchema,
  PRESENTATION_FILE,
  type Project,
  type ProjectDetail,
} from "./meta";
import { createLinkSchema } from "./payments-schema";
import { getObject, headObject, isSafeKey, listFolders, listKeys } from "./r2";
import {
  createLink,
  expireLink,
  findCustomer,
  isStripeConfigured,
  listCatalog,
  listLinks,
  PaymentError,
} from "./stripe";

const SLUG = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const META_FILE = "_meta.json";
const DIST = "./dist";
// request headers forwarded to R2 / response headers passed back from it
const CONDITIONAL = ["if-none-match", "if-modified-since", "range"];
const PASS_THROUGH = [
  "etag",
  "last-modified",
  "content-range",
  "accept-ranges",
];
// Decks are driven by hotkeys, so their on-screen control bar stays hidden. It
// is hidden, not removed: the deck's script looks its buttons up on load.
const DECK_STYLE = "<style>#bar{display:none!important}</style>";

const PAID_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Payment received</title>
<style>
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:#14110f;color:#f6f3ee;font:16px/1.5 system-ui,sans-serif;text-align:center}
h1{margin:0 0 8px;font-size:28px}
p{margin:0;color:#b5aea5}
</style>
</head>
<body>
<main>
<h1>Payment received. Thank you!</h1>
<p>Your website goes live within one day.</p>
</main>
</body>
</html>`;

const app = new Hono();

app.get("/healthz", (c) => c.text("ok"));

// Public, before the password: clients land here after paying. No client data.
app.get("/paid", (c) => c.html(PAID_PAGE));

// One password for the whole app: the Coolify URL is public, the designs and
// business data are not.
const { APP_PASSWORD, NODE_ENV } = process.env;
if (APP_PASSWORD) {
  app.use(
    basicAuth({
      username: process.env.APP_USER || "ali",
      password: APP_PASSWORD,
    })
  );
} else if (NODE_ENV === "production") {
  throw new Error("APP_PASSWORD is required in production.");
}

const readProject = async (slug: string): Promise<Project> => {
  const res = await getObject(`${slug}/${META_FILE}`);
  if (res.status === 404) {
    await res.body?.cancel();
    return { slug, meta: null, metaStatus: "missing", updatedAt: null };
  }
  if (!res.ok) throw new Error(`Storage get failed (${res.status})`);

  const lastModified = res.headers.get("last-modified");
  const modifiedAt = lastModified ? new Date(lastModified).toISOString() : null;
  const parsed = metaSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) {
    return { slug, meta: null, metaStatus: "invalid", updatedAt: modifiedAt };
  }
  return {
    slug,
    meta: parsed.data,
    metaStatus: "ok",
    updatedAt: parsed.data.uploadedAt ?? modifiedAt,
  };
};

const time = (value: string | null) => (value && Date.parse(value)) || 0;

// Read per request so changing it on Coolify needs no image rebuild.
app.get("/api/config", (c) =>
  c.json({
    originAddress: process.env.ORIGIN_ADDRESS || null,
    stripeEnabled: isStripeConfigured(),
  })
);

app.get("/api/stripe/catalog", async (c) => c.json(await listCatalog()));

app.get("/api/stripe/customer", async (c) => {
  const customer = await findCustomer(c.req.query("email") ?? "");
  return c.json(
    customer && { name: customer.name ?? null, email: customer.email ?? null }
  );
});

app.get("/api/projects/:slug/payments", async (c) => {
  const slug = c.req.param("slug");
  if (!SLUG.test(slug)) return c.json({ error: "Invalid project" }, 400);
  return c.json(await listLinks(slug));
});

app.post("/api/projects/:slug/payments", async (c) => {
  const slug = c.req.param("slug");
  if (!SLUG.test(slug)) return c.json({ error: "Invalid project" }, 400);
  const input = createLinkSchema.safeParse(
    await c.req.json().catch(() => null)
  );
  if (!input.success) {
    const message = input.error.issues[0]?.message ?? "Invalid request";
    return c.json({ error: message }, 400);
  }
  if ((await listKeys(`${slug}/`)).length === 0) {
    return c.json({ error: "Project not found" }, 404);
  }
  // Behind Coolify's proxy the app itself only sees http.
  const proto = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const url = new URL(c.req.url);
  const baseUrl = `${proto || url.protocol.replace(":", "")}://${url.host}`;
  return c.json(await createLink(slug, input.data, baseUrl), 201);
});

app.post("/api/projects/:slug/payments/:id/expire", async (c) => {
  await expireLink(c.req.param("slug"), c.req.param("id"));
  return c.json({ expired: true });
});

app.get("/api/projects", async (c) => {
  const slugs = (await listFolders()).filter((slug) => SLUG.test(slug));
  const projects = await Promise.all(slugs.map(readProject));
  // newest first, folders without a date last
  projects.sort(
    (a, b) =>
      time(b.updatedAt) - time(a.updatedAt) || a.slug.localeCompare(b.slug)
  );
  return c.json(projects);
});

app.get("/api/projects/:slug", async (c) => {
  const slug = c.req.param("slug");
  if (!SLUG.test(slug)) return c.json({ error: "Invalid project" }, 400);

  const [project, keys] = await Promise.all([
    readProject(slug),
    listKeys(`${slug}/`),
  ]);
  if (keys.length === 0) return c.json({ error: "Project not found" }, 404);

  const html = keys
    .filter((key) => key.endsWith(".html"))
    .map((key) => key.slice(slug.length + 1));
  // the deck is opened from its own button, not listed as a site page
  const pages = html
    .filter((page) => page !== PRESENTATION_FILE)
    .sort(
      (a, b) =>
        Number(b === "index.html") - Number(a === "index.html") ||
        a.localeCompare(b)
    );
  const detail: ProjectDetail = {
    ...project,
    pages,
    hasPresentation: html.includes(PRESENTATION_FILE),
  };
  return c.json(detail);
});

// Streams one file of a client site out of R2. Clean URLs resolve the way a
// static host would: /about -> about.html, /services -> services/index.html.
const serveSite = async (c: Context) => {
  const { pathname, search } = new URL(c.req.url);
  const [, , slug = "", ...segments] = pathname.split("/");
  if (!SLUG.test(slug)) return c.text("Not found", 404);
  // /sites/<slug> needs the trailing slash or relative links resolve wrong
  if (pathname === `/sites/${slug}`) return c.redirect(`${pathname}/${search}`);

  let rest: string;
  try {
    rest = decodeURIComponent(segments.join("/"));
  } catch {
    return c.text("Bad path", 400);
  }
  const isDir = rest === "" || rest.endsWith("/");
  let key = `${slug}/${isDir ? `${rest}index.html` : rest}`;
  if (!isSafeKey(key)) return c.text("Bad path", 400);

  // The deck is rewritten below, so it always needs the full file: a 304 would
  // bring back a copy cached before the rewrite.
  const isDeck = key === `${slug}/${PRESENTATION_FILE}`;
  const headers: Record<string, string> = {};
  for (const name of isDeck ? [] : CONDITIONAL) {
    const value = c.req.header(name);
    if (value) headers[name] = value;
  }

  let res = await getObject(key, headers);
  if (res.status === 404 && !isDir && !/\.[a-z0-9]+$/i.test(rest)) {
    await res.body?.cancel();
    res = await getObject(`${key}.html`, headers);
    if (res.status !== 404) {
      key = `${key}.html`;
    } else if ((await headObject(`${key}/index.html`)).ok) {
      await res.body?.cancel();
      return c.redirect(`${pathname}/${search}`);
    }
  }
  if (res.status === 404) {
    await res.body?.cancel();
    return c.text("Not found", 404);
  }
  if (!res.ok && res.status !== 304) {
    await res.body?.cancel();
    return c.text("Storage error", 502);
  }

  if (isDeck) {
    const html = await res.text();
    return new Response(html.replace(/<\/head>/i, `${DECK_STYLE}</head>`), {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  // Extension wins over whatever content type the uploader stored.
  const out = new Headers({
    "Cache-Control": "no-cache",
    "Content-Type":
      getMimeType(key) ??
      res.headers.get("content-type") ??
      "application/octet-stream",
  });
  for (const name of PASS_THROUGH) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  // fetch already decoded an encoded body, so its stored length is wrong
  const length = res.headers.get("content-length");
  if (length && !res.headers.has("content-encoding")) {
    out.set("Content-Length", length);
  }
  return new Response(res.body, { status: res.status, headers: out });
};

app.get("/sites/:slug", serveSite);
app.get("/sites/:slug/*", serveSite);

// Designs that use root-absolute URLs (/images/x.png, a logo linking to /)
// request them from the app root. The Referer says which site asked, so send
// the request back under that site's prefix. Runs before the app's own files
// so a site's "/" link does not load this app inside the preview.
app.use(async (c, next) => {
  const { pathname, search, host } = new URL(c.req.url);
  const referer = c.req.header("referer");
  if (
    referer &&
    !pathname.startsWith("/_app/") &&
    !pathname.startsWith("/api/")
  ) {
    try {
      const from = new URL(referer);
      const slug = /^\/sites\/([^/]+)\//.exec(from.pathname)?.[1];
      if (from.host === host && slug && SLUG.test(slug)) {
        return c.redirect(`/sites/${slug}${pathname}${search}`);
      }
    } catch {
      // unparseable Referer: fall through to the app
    }
  }
  await next();
});

// Built front end (absent in dev, where Vite serves it).
if (existsSync(`${DIST}/index.html`)) {
  const indexHtml = readFileSync(`${DIST}/index.html`, "utf8");
  app.use(
    serveStatic({
      root: DIST,
      onFound: (path, c) => {
        c.header(
          "Cache-Control",
          path.includes("/_app/")
            ? "private, max-age=31536000, immutable"
            : "no-cache"
        );
      },
    })
  );
  // SPA fallback for client-side routes like /p/<slug>
  app.get("*", (c) => {
    const { pathname } = new URL(c.req.url);
    if (pathname.startsWith("/api/") || /\.[a-z0-9]+$/i.test(pathname)) {
      return c.text("Not found", 404);
    }
    c.header("Cache-Control", "no-cache");
    return c.html(indexHtml);
  });
}

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  if (err instanceof PaymentError) return c.json({ error: err.message }, 400);
  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    return c.json({ error: "Stripe rejected the API key." }, 502);
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    return c.json({ error: err.message }, 400);
  }
  console.error(err);
  return c.json({ error: "Server error" }, 500);
});

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3028 }, (info) => {
  console.log(`client-websites server on http://localhost:${info.port}`);
});
