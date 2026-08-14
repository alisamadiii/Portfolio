import "server-only";

import { createHttpError } from "@/lib/api-error";
import { getServerUser } from "@/lib/session-server";

// Admin access follows the shared Better Auth admin plugin role.
const hasAdminAccess = (user: { role?: string | null } | null | undefined) => {
  return user?.role === "admin";
};

const requireAdminSession = async () => {
  const user = await getServerUser();

  if (!user) {
    throw createHttpError("Not signed in.", 401);
  }

  if (!hasAdminAccess(user)) {
    throw createHttpError("Admin access required.", 403);
  }

  return { user };
};

export { hasAdminAccess, requireAdminSession };
