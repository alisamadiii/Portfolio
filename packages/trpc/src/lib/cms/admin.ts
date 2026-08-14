import "server-only";

// Admin access follows the shared Better Auth admin plugin role.
const hasAdminAccess = (user: { role?: string | null } | null | undefined) => {
  return user?.role === "admin";
};

export { hasAdminAccess };
