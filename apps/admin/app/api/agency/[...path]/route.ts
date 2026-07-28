import type { NextRequest } from "next/server";

import { createHttpCaller } from "@workspace/trpc/http-caller";

// Server-side proxy to the agency API worker. The browser talks to
// /api/agency/* through the SDK (see @/lib/agency); this handler stamps the
// admin key on the way through so it never ships in the client bundle.
//
// The gate reuses the same session check the admin layout does: forward the
// incoming cookies to the portal's tRPC endpoint and require an admin role.

// Errors use the worker's envelope so the SDK parses them like any other.
const err = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const baseUrl = process.env.AGENCY_API_URL?.replace(/\/+$/, "");
  const apiKey = process.env.AGENCY_ADMIN_API_KEY;
  if (!baseUrl || !apiKey) {
    return err(
      500,
      "PROXY_NOT_CONFIGURED",
      "AGENCY_API_URL and AGENCY_ADMIN_API_KEY must be set."
    );
  }

  let user;
  try {
    user = await createHttpCaller(req.headers).users.getSession.query();
  } catch {
    return err(401, "UNAUTHORIZED", "Not signed in.");
  }
  if (user?.role !== "admin") {
    return err(403, "ADMIN_REQUIRED", "Admin session required.");
  }

  const { path } = await ctx.params;
  const url = `${baseUrl}/${path.join("/")}${req.nextUrl.search}`;
  // Body read as text (small JSON payloads) — streaming req.body would need
  // duplex: "half". Never forward the browser's Cookie/Authorization upstream.
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const contentType = req.headers.get("content-type");

  const upstream = await fetch(url, {
    method: req.method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(contentType ? { "content-type": contentType } : {}),
    },
    ...(hasBody ? { body: await req.text() } : {}),
    cache: "no-store",
  });

  if (upstream.status === 204) return new Response(null, { status: 204 });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      // Pass content-type through — env reveals answer text/plain.
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
