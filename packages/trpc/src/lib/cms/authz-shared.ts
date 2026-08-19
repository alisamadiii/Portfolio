import type { CollaboratorRole } from "@workspace/drizzle/schema";

type UserLike =
  | {
      role?: string | null;
      isAdmin?: boolean;
    }
  | null
  | undefined;

// Client-safe admin check: server users carry `role`, context users carry `isAdmin`.
const isAdminUser = (user: UserLike): boolean =>
  Boolean(user?.isAdmin || user?.role === "admin");

const assertAdminUser = (
  user: UserLike,
  message = "Only admins can perform this action."
) => {
  if (!isAdminUser(user)) {
    throw new Error(message);
  }
};

// Collaborator role hierarchy: view-only < content-editor < full-access.
const ROLE_RANK: Record<CollaboratorRole, number> = {
  "view-only": 0,
  "content-editor": 1,
  "full-access": 2,
};

const roleAtLeast = (role: CollaboratorRole, min: CollaboratorRole): boolean =>
  ROLE_RANK[role] >= ROLE_RANK[min];

export { isAdminUser, assertAdminUser, roleAtLeast };
export type { CollaboratorRole };
