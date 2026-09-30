import { and, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "./db";
import {
  collaboratorInviteTable,
  collaboratorTable,
  userTable,
} from "./db";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const collaboratorMatchesUser = (user: { id: string; email: string }) =>
  or(
    eq(collaboratorTable.userId, user.id),
    and(
      isNull(collaboratorTable.userId),
      sql`lower(${collaboratorTable.email}) = lower(${user.email})`
    )
  );

// Access is keyed by repoId (the project's stable, globally-unique identity).
// owner/repo on the collaborator row are display-only and can drift on a GitHub
// rename/transfer, so they are never used to decide access.
const collaboratorMatchesUserForRepoId = (
  user: { id: string; email: string },
  repoId: number
) => and(collaboratorMatchesUser(user), eq(collaboratorTable.repoId, repoId));

const collaboratorMatchesEmailForRepoId = (email: string, repoId: number) =>
  and(
    sql`lower(${collaboratorTable.email}) = lower(${email})`,
    eq(collaboratorTable.repoId, repoId)
  );

const findVerifiedUserByEmail = async (email: string) => {
  return db.query.user.findFirst({
    where: and(
      sql`lower(${userTable.email}) = lower(${normalizeEmail(email)})`,
      eq(userTable.emailVerified, true)
    ),
  });
};

const bindCollaboratorInvitesToUser = async (
  user: { id: string; email: string; emailVerified: boolean }
) => {
  if (!user.emailVerified) return;

  await db
    .update(collaboratorTable)
    .set({ userId: user.id })
    .where(
      and(
        isNull(collaboratorTable.userId),
        sql`lower(${collaboratorTable.email}) = lower(${normalizeEmail(user.email)})`
      )
    );

  await db
    .delete(collaboratorInviteTable)
    .where(
      sql`lower(${collaboratorInviteTable.email}) = lower(${normalizeEmail(user.email)})`
    );
};

export {
  bindCollaboratorInvitesToUser,
  collaboratorMatchesEmailForRepoId,
  collaboratorMatchesUser,
  collaboratorMatchesUserForRepoId,
  findVerifiedUserByEmail,
  normalizeEmail,
};
