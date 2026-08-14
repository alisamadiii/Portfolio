import { cache } from "react";
import { headers } from "next/headers";

import { createHttpCaller } from "@workspace/trpc/http-caller";

// tRPC's authenticatedProcedure throws UNAUTHORIZED (never null) when signed out.
const isUnauthorized = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  (error as { data?: { code?: string } }).data?.code === "UNAUTHORIZED";

// Session lives in the portfolio backend (which owns Better Auth + the secret).
// Resolve it over tRPC HTTP with the browser cookie forwarded, so CMS needs no
// BETTER_AUTH_SECRET of its own. Mirrors apps/admin.
const resolveUserFromHeaders = async (requestHeaders: Headers) => {
  try {
    return await createHttpCaller(requestHeaders).users.getSession.query();
  } catch (error) {
    if (isUnauthorized(error)) return null;
    throw error;
  }
};

const getServerUser = cache(async () => resolveUserFromHeaders(await headers()));

const getServerSession = cache(async () => {
  const user = await getServerUser();
  return user ? { user } : null;
});

const requireApiUserSession = async () => {
  const user = await getServerUser();
  if (!user) {
    return { response: new Response(null, { status: 401 }) };
  }

  return { user };
};

export {
  getServerUser,
  getServerSession,
  requireApiUserSession,
  resolveUserFromHeaders,
};
