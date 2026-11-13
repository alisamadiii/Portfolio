import { createHash } from "crypto";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";

import { db } from "./db";
import {
  collaboratorInviteTable,
  collaboratorTable,
  userTable,
} from "./db";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Invite tokens are stored hashed; the raw token only lives in the email link. */
const hashInviteToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// Only a row bound to the account grants access. A pending row (userId null)
// grants nothing, even to a user with the same email: it gets bound by
// claiming the emailed link, or by bindCollaboratorInvitesToUser for a
// verified email while the invite is still valid.
const collaboratorMatchesUser = (user: { id: string }) =>
  eq(collaboratorTable.userId, user.id);

// Access is keyed by projectId (the project's stable, globally-unique identity).
// owner/repo on the collaborator row are display-only and can drift on a GitHub
// rename/transfer, so they are never used to decide access.
const collaboratorMatchesUserForProjectId = (
  user: { id: string },
  projectId: string
) => and(collaboratorMatchesUser(user), eq(collaboratorTable.projectId, projectId));

const findVerifiedUserByEmail = async (email: string) => {
  return db.query.user.findFirst({
    where: and(
      sql`lower(${userTable.email}) = lower(${normalizeEmail(email)})`,
      eq(userTable.emailVerified, true)
    ),
  });
};

/**
 * Binds pending rows for a verified email, but only on projects whose invite
 * is still valid: an expired invite stays expired until it's resent.
 */
const bindCollaboratorInvitesToUser = async (
  user: { id: string; email: string; emailVerified: boolean }
) => {
  if (!user.emailVerified) return;
  const email = normalizeEmail(user.email);

  const invites = await db
    .select({ id: collaboratorInviteTable.id, projectId: collaboratorInviteTable.projectId })
    .from(collaboratorInviteTable)
    .where(
      and(
        sql`lower(${collaboratorInviteTable.email}) = ${email}`,
        gt(collaboratorInviteTable.expiresAt, new Date())
      )
    );
  const projectIds = invites.flatMap((i) => (i.projectId ? [i.projectId] : []));
  if (projectIds.length === 0) return;

  await db
    .update(collaboratorTable)
    .set({ userId: user.id })
    .where(
      and(
        isNull(collaboratorTable.userId),
        sql`lower(${collaboratorTable.email}) = ${email}`,
        inArray(collaboratorTable.projectId, projectIds)
      )
    );

  await db.delete(collaboratorInviteTable).where(
    inArray(
      collaboratorInviteTable.id,
      invites.map((i) => i.id)
    )
  );
};

export {
  bindCollaboratorInvitesToUser,
  collaboratorMatchesUser,
  collaboratorMatchesUserForProjectId,
  findVerifiedUserByEmail,
  hashInviteToken,
  normalizeEmail,
};
