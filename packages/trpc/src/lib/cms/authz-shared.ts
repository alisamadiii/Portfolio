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

export { isAdminUser, assertAdminUser };
