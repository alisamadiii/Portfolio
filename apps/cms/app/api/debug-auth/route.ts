import { headers } from "next/headers";
import { auth } from "@workspace/auth/auth";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Temporary diagnostics for the prod session bounce. Reports cookie NAMES,
 * env presence booleans and the getSession outcome — never secret values.
 *
 * GET /api/debug-auth
 */
export async function GET() {
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const cookieNames = cookieHeader
    .split(";")
    .map((part) => part.split("=")[0]?.trim())
    .filter(Boolean);

  let sessionResult: { ok: boolean; hasUser?: boolean; email?: string; error?: string };
  try {
    const session = await auth.api.getSession({ headers: requestHeaders });
    sessionResult = {
      ok: true,
      hasUser: Boolean(session?.user),
      email: session?.user?.email,
    };
  } catch (error: any) {
    sessionResult = { ok: false, error: error?.message ?? String(error) };
  }

  let dbResult: { ok: boolean; error?: string };
  try {
    await db.execute(sql`select 1`);
    dbResult = { ok: true };
  } catch (error: any) {
    dbResult = { ok: false, error: error?.message ?? String(error) };
  }

  return Response.json({
    host: requestHeaders.get("host"),
    cookieNames,
    env: {
      BETTER_AUTH_SECRET: Boolean(process.env.BETTER_AUTH_SECRET),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? null,
      BASE_URL: process.env.BASE_URL ?? null,
      GITHUB_ORG: process.env.GITHUB_ORG ?? null,
      INTERNAL_API_SECRET: Boolean(process.env.INTERNAL_API_SECRET),
      NODE_ENV: process.env.NODE_ENV,
    },
    session: sessionResult,
    db: dbResult,
  });
}
