import type { User } from "./types";

/**
 * Map the Better Auth session user (ctx.session.user) onto the CMS engine's
 * `User` shape. The engine only reads id/email/name/image/emailVerified/role;
 * hub's old REST layer resolved the same shape via users.getSession.
 */
type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string | null;
};

const toCmsUser = (sessionUser: SessionUser): User => ({
  id: sessionUser.id,
  email: sessionUser.email,
  name: sessionUser.name,
  image: sessionUser.image ?? null,
  emailVerified: sessionUser.emailVerified,
  role: sessionUser.role ?? null,
});

export { toCmsUser };
