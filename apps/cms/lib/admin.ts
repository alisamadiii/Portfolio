import "server-only";

import { headers } from "next/headers";

import { auth } from "@workspace/auth/auth";

import { createHttpError } from "@/lib/api-error";

// Admin access follows the shared Better Auth admin plugin role.
const hasAdminAccess = (user: { role?: string | null } | null | undefined) => {
  return user?.role === "admin";
};

const requireAdminSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const user = session?.user;

  if (!user) {
    throw createHttpError("Not signed in.", 401);
  }

  if (!hasAdminAccess(user)) {
    throw createHttpError("Admin access required.", 403);
  }

  return { session, user };
};

export { hasAdminAccess, requireAdminSession };
