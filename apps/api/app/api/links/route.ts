import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@workspace/auth/auth";
import { ALLOWED_ORIGINS } from "@workspace/trpc/lib/allow-origin";
import { db } from "@workspace/drizzle/index";
import { shortLink } from "@workspace/drizzle/schema";

// Admin-only CRUD for the URL shortener (www.alisamadii.com/<slug>). Lives on
// the api app; the /links admin page (on the portfolio app) calls it
// cross-origin with the shared session cookie, so every response carries CORS
// credentials headers scoped to an allowed origin.

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowed =
    origin && ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0]!;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(req: Request, body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...corsHeaders(req), ...init?.headers },
  });
}

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req) });
}

// Lowercase only, no ambiguous chars (0/O, 1/l) — slugs get read aloud
// and typed by hand.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
function generateSlug(length = 5) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

async function requireAdmin(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user.role !== "admin") {
    return json(req, { error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request) {
  const forbidden = await requireAdmin(req);
  if (forbidden) return forbidden;

  const links = await db
    .select()
    .from(shortLink)
    .orderBy(desc(shortLink.createdAt));
  return json(req, links);
}

const createSchema = z.object({
  url: z.string().url(),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9-]{3,32}$/)
    .optional(),
});

export async function POST(req: Request) {
  const forbidden = await requireAdmin(req);
  if (forbidden) return forbidden;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json(req, { error: "Invalid input" }, { status: 400 });
  }

  const attempts = parsed.data.slug ? 1 : 3;
  for (let i = 0; i < attempts; i++) {
    const slug = parsed.data.slug ?? generateSlug();
    try {
      const [link] = await db
        .insert(shortLink)
        .values({ slug, url: parsed.data.url })
        .returning();
      return json(req, link, { status: 201 });
    } catch (error) {
      const taken =
        error instanceof Error && error.message.includes("short_link_slug");
      if (!taken || i === attempts - 1) {
        return json(
          req,
          { error: taken ? "Slug already taken" : "Failed to create link" },
          { status: taken ? 409 : 500 }
        );
      }
    }
  }
  return json(req, { error: "Failed to create link" }, { status: 500 });
}

export async function DELETE(req: Request) {
  const forbidden = await requireAdmin(req);
  if (forbidden) return forbidden;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return json(req, { error: "Missing id" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(shortLink)
    .where(eq(shortLink.id, id))
    .returning();
  if (!deleted) {
    return json(req, { error: "Not found" }, { status: 404 });
  }
  return json(req, deleted);
}
