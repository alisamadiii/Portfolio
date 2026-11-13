import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@workspace/auth/auth";
import { email as emailService } from "@workspace/email";
import CollaboratorInviteEmail from "@workspace/email/emails/collaborator-invite";
import CollaboratorAddedEmail from "@workspace/email/emails/collaborator-added";
import { agencyClient, COLLABORATOR_ROLE_VALUES } from "@workspace/drizzle/schema";

import {
  authenticatedProcedure,
  baseProcedure,
  collaboratorManageProcedure,
  createTRPCRouter,
} from "@workspace/trpc/init";
import {
  collaboratorInviteTable,
  collaboratorTable,
  db,
  userTable,
} from "@workspace/trpc/lib/cms/db";
import {
  bindCollaboratorInvitesToUser,
  findVerifiedUserByEmail,
  hashInviteToken,
  normalizeEmail,
} from "@workspace/trpc/lib/cms/collaborator-access";
import {
  INVITE_BATCH_MAX,
  INVITES_PER_HOUR,
  memberStatus,
  type MemberStatus,
} from "@workspace/trpc/lib/cms/members-shared";
import { toTRPCError } from "@workspace/trpc/lib/cms/errors";

// The invite acceptance page lives in the hub app; emails link back to it and
// redirect there after accepting. This tRPC lives in the portfolio backend, so
// it resolves the hub's public URL itself (mirrors apps/hub/lib/base-url.ts).
const getHubBaseUrl = () =>
  process.env.NODE_ENV === "production"
    ? "https://app.alisamadii.com"
    : "http://localhost:3007";

const EMAIL_FROM = "Ali Samadi CMS <no-reply@alisamadii.com>";

type InviteState =
  | { status: "unavailable" }
  | { status: "wrong_account" }
  | { status: "ready"; destinationPath: string }
  | { status: "signin_required"; maskedEmail: string; destinationPath: string };

type InviteRow = typeof collaboratorInviteTable.$inferSelect;

// Projects are addressed by projectId (/p/<projectId>); owner/repo are display-only.
const getDestinationPath = (invite: InviteRow) => `/p/${invite.projectId}`;

const maskEmail = (address: string) => {
  const [name, domain] = address.split("@");
  if (!name || !domain) return address;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(1, name.length - visible.length))}@${domain}`;
};

// Loads a valid, still-claimable invite. Deletes expired invites and invites
// whose backing collaborator row no longer exists.
const loadInvite = async (token: string): Promise<InviteRow | null> => {
  const invite = await db.query.hubCollaboratorInvite.findFirst({
    where: eq(collaboratorInviteTable.token, hashInviteToken(token)),
  });
  if (!invite) return null;

  if (invite.expiresAt <= new Date()) {
    await db
      .delete(collaboratorInviteTable)
      .where(eq(collaboratorInviteTable.id, invite.id));
    return null;
  }

  const collaborator = invite.projectId
    ? await db.query.hubCollaborator.findFirst({
        where: and(
          sql`lower(${collaboratorTable.email}) = lower(${invite.email})`,
          eq(collaboratorTable.projectId, invite.projectId)
        ),
      })
    : null;
  if (!collaborator) {
    await db
      .delete(collaboratorInviteTable)
      .where(eq(collaboratorInviteTable.id, invite.id));
    return null;
  }

  return invite;
};

const claimInviteForUser = async (
  invite: InviteRow,
  user: { id: string; email: string }
) => {
  if (normalizeEmail(user.email) !== normalizeEmail(invite.email)) {
    return false;
  }

  if (invite.projectId) {
    await db
      .update(collaboratorTable)
      .set({ userId: user.id })
      .where(
        and(
          sql`lower(${collaboratorTable.email}) = lower(${invite.email})`,
          eq(collaboratorTable.projectId, invite.projectId)
        )
      );
  }

  await db
    .delete(collaboratorInviteTable)
    .where(eq(collaboratorInviteTable.id, invite.id));

  return true;
};

const generateInviteToken = () => randomBytes(32).toString("base64url");

// Caps invite emails per project (DB-backed, so it holds across instances):
// every invite email creates/replaces an invite row stamped createdAt.
const assertInviteQuota = async (projectId: string, sending: number) => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collaboratorInviteTable)
    .where(
      and(
        eq(collaboratorInviteTable.projectId, projectId),
        gt(collaboratorInviteTable.createdAt, new Date(Date.now() - 60 * 60 * 1000))
      )
    );
  if ((row?.count ?? 0) + sending > INVITES_PER_HOUR) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many invites sent for this project. Try again in an hour.",
    });
  }
};

// Collaborator scoped to the caller's project: a foreign id is NOT_FOUND.
const findProjectCollaborator = async (projectId: string, collaboratorId: number) => {
  const collaborator = await db.query.hubCollaborator.findFirst({
    where: and(
      eq(collaboratorTable.id, collaboratorId),
      eq(collaboratorTable.projectId, projectId)
    ),
  });
  if (!collaborator) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Member not found." });
  }
  return collaborator;
};

// Creates (or replaces) a pending invite for an email and returns the hub link.
const createInviteUrl = async ({
  email,
  projectId,
  owner,
  repo,
}: {
  email: string;
  projectId: string;
  owner: string;
  repo: string;
}) => {
  const token = generateInviteToken();
  const expiresAt = new Date(
    Date.now() +
      (Number(process.env.COLLABORATOR_INVITE_LINK_EXPIRES_IN) || 86400) * 1000
  );

  await db
    .delete(collaboratorInviteTable)
    .where(
      and(
        sql`lower(${collaboratorInviteTable.email}) = lower(${email})`,
        eq(collaboratorInviteTable.projectId, projectId)
      )
    );

  await db
    .insert(collaboratorInviteTable)
    .values({ token: hashInviteToken(token), email, projectId, owner, repo, expiresAt });

  const inviteUrl = new URL("/sign-in/collaborator", getHubBaseUrl());
  inviteUrl.searchParams.set("token", token);
  return inviteUrl.toString();
};

const tokenInput = z.object({ token: z.string().min(1) });

export const collaboratorsRouter = createTRPCRouter({
  /**
   * Everyone with access to the project for the Members page: owner(s), the
   * agency admins, then collaborators with their invite status.
   */
  members: collaboratorManageProcedure.query(async ({ ctx }) => {
    try {
      const { repoAccess, isActorAdmin, isActorOwner } = ctx;
      const projectId = repoAccess.projectId;

      const agencyOwner = await db.query.agencyClient.findFirst({
        where: eq(agencyClient.projectId, projectId),
        columns: { userId: true },
      });
      const ownerIds = [
        ...new Set(
          [repoAccess.githubConnectedUserId, agencyOwner?.userId].filter(
            (id): id is string => Boolean(id)
          )
        ),
      ];

      const userColumns = {
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
      };
      const [owners, admins, collaborators, invites] = await Promise.all([
        ownerIds.length
          ? db.select(userColumns).from(userTable).where(inArray(userTable.id, ownerIds))
          : [],
        db
          .select(userColumns)
          .from(userTable)
          .where(eq(userTable.role, "admin")),
        db
          .select({
            id: collaboratorTable.id,
            email: collaboratorTable.email,
            role: collaboratorTable.role,
            userId: collaboratorTable.userId,
            name: userTable.name,
            image: userTable.image,
          })
          .from(collaboratorTable)
          .leftJoin(userTable, eq(userTable.id, collaboratorTable.userId))
          .where(eq(collaboratorTable.projectId, projectId)),
        db
          .select({
            email: collaboratorInviteTable.email,
            expiresAt: collaboratorInviteTable.expiresAt,
          })
          .from(collaboratorInviteTable)
          .where(eq(collaboratorInviteTable.projectId, projectId)),
      ]);

      const inviteExpiry = new Map(
        invites.map((i) => [normalizeEmail(i.email), i.expiresAt])
      );
      const ownerSet = new Set(ownerIds);

      return {
        canManageFullAccess: isActorAdmin || isActorOwner,
        owners,
        // An admin who also owns the project shows once, as owner.
        admins: admins.filter((a) => !ownerSet.has(a.id)),
        collaborators: collaborators.map((c) => {
          const expiresAt = c.userId
            ? null
            : (inviteExpiry.get(normalizeEmail(c.email)) ?? null);
          const status: MemberStatus = memberStatus(c.userId, expiresAt);
          return { ...c, status, expiresAt };
        }),
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw toTRPCError(error);
    }
  }),

  /**
   * Public: resolves an invite token into the state the acceptance page renders.
   * Read-only — actual acceptance happens in `claim` once the user is signed in.
   */
  getInvite: baseProcedure
    .input(tokenInput)
    .query(async ({ input }): Promise<InviteState> => {
      const invite = await loadInvite(input.token);
      if (!invite) return { status: "unavailable" };

      const session = await auth.api.getSession({ headers: await headers() });
      const destinationPath = getDestinationPath(invite);

      if (!session?.user) {
        return {
          status: "signin_required",
          maskedEmail: maskEmail(invite.email),
          destinationPath,
        };
      }

      if (normalizeEmail(session.user.email) !== normalizeEmail(invite.email)) {
        return { status: "wrong_account" };
      }

      return { status: "ready", destinationPath };
    }),

  /**
   * Binds any pending collaborator invites for the signed-in user's email to
   * their account. Called on CMS entry (previously a Better Auth session hook).
   */
  bindInvites: authenticatedProcedure.mutation(async ({ ctx }) => {
    await bindCollaboratorInvitesToUser(ctx.session.user);
    return { success: true };
  }),

  /**
   * Claims an invite for the signed-in user (binds their account to the
   * collaborator row and consumes the token).
   */
  claim: authenticatedProcedure
    .input(tokenInput)
    .mutation(async ({ ctx, input }): Promise<InviteState> => {
      const invite = await loadInvite(input.token);
      if (!invite) return { status: "unavailable" };

      const claimed = await claimInviteForUser(invite, ctx.session.user);
      if (!claimed) return { status: "wrong_account" };

      return { status: "ready", destinationPath: getDestinationPath(invite) };
    }),

  /**
   * Invites one or more collaborators. Existing verified users are added
   * immediately (and emailed a heads-up); unknown emails get a pending invite
   * link. Admins/full-access only; only admins can grant full-access.
   */
  add: collaboratorManageProcedure
    .input(
      z.object({
        emails: z.array(z.string().email()).min(1).max(INVITE_BATCH_MAX),
        role: z.enum(COLLABORATOR_ROLE_VALUES).default("content-editor"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { repoAccess, isActorAdmin, isActorOwner } = ctx;
        const canManageFullAccess = isActorAdmin || isActorOwner;
        // Display strings only — access is scoped by repoAccess.projectId.
        const owner = repoAccess.ownerLogin;
        const repo = repoAccess.repoName;
        const user = ctx.session.user;

        if (!canManageFullAccess && input.role === "full-access") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins or the project owner can grant full access.",
          });
        }

        const emails = Array.from(
          new Set(input.emails.map((email) => normalizeEmail(email)))
        );
        await assertInviteQuota(repoAccess.projectId, emails.length);

        const baseUrl = getHubBaseUrl();
        const repoUrl = new URL(`/p/${repoAccess.projectId}`, baseUrl).toString();
        const created: (typeof collaboratorTable.$inferSelect)[] = [];
        const errors: string[] = [];
        let immediateAccessCount = 0;
        let pendingInviteCount = 0;

        for (const email of emails) {
          const existingUser = await findVerifiedUserByEmail(email);
          const existing = await db.query.hubCollaborator.findFirst({
            where: and(
              eq(collaboratorTable.projectId, repoAccess.projectId),
              sql`lower(${collaboratorTable.email}) = lower(${email})`
            ),
          });

          if (existing) {
            if (existingUser && existing.userId !== existingUser.id) {
              const updated = await db
                .update(collaboratorTable)
                .set({ userId: existingUser.id })
                .where(eq(collaboratorTable.id, existing.id))
                .returning();
              if (updated.length > 0) {
                created.push(...updated);
                immediateAccessCount += 1;
              }
            }
            errors.push(`${email} is already invited to "${owner}/${repo}".`);
            continue;
          }

          if (!existingUser) {
            const inviteUrl = await createInviteUrl({
              email,
              projectId: repoAccess.projectId,
              owner,
              repo,
            });
            const { error } = await emailService.send({
              from: EMAIL_FROM,
              to: email,
              subject: `Join "${owner}/${repo}" on Client Hub`,
              react: CollaboratorInviteEmail({
                inviteUrl,
                repoName: `${owner}/${repo}`,
                email,
                invitedByName: user.name || user.email,
                invitedByUrl: baseUrl,
              }),
            });
            if (error) {
              errors.push(`${email}: ${error}`);
              continue;
            }
          } else {
            const { error } = await emailService.send({
              from: EMAIL_FROM,
              to: email,
              subject: `You were added to "${owner}/${repo}" on Client Hub`,
              react: CollaboratorAddedEmail({
                email,
                repoName: `${owner}/${repo}`,
                repoUrl,
                invitedByName: user.name || user.email,
                invitedByUrl: baseUrl,
              }),
            });
            if (error) {
              errors.push(`${email}: ${error}`);
            }
          }

          const inserted = await db
            .insert(collaboratorTable)
            .values({
              type: repoAccess.ownerType,
              projectId: repoAccess.projectId,
              owner: repoAccess.ownerLogin,
              repo: repoAccess.repoName,
              email,
              userId: existingUser?.id ?? null,
              invitedBy: user.id,
              role: input.role,
            })
            .returning();

          if (inserted.length > 0) {
            created.push(...inserted);
            if (existingUser) immediateAccessCount += 1;
            else pendingInviteCount += 1;
          }
        }

        if (created.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: errors.join(" ") || "No collaborators were added.",
          });
        }

        const message =
          immediateAccessCount > 0 && pendingInviteCount > 0
            ? `${immediateAccessCount} collaborator${immediateAccessCount === 1 ? "" : "s"} added immediately and ${pendingInviteCount} invite${pendingInviteCount === 1 ? "" : "s"} sent for "${owner}/${repo}".`
            : immediateAccessCount > 0
              ? `${immediateAccessCount} collaborator${immediateAccessCount === 1 ? "" : "s"} added to "${owner}/${repo}".`
              : pendingInviteCount === 1
                ? `${created[0].email} invited to "${owner}/${repo}".`
                : `${pendingInviteCount} collaborators invited to "${owner}/${repo}".`;

        return { message, data: created, errors };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /**
   * Removes a collaborator (and any pending invite for that email).
   */
  remove: collaboratorManageProcedure
    .input(z.object({ collaboratorId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { repoAccess, isActorAdmin, isActorOwner } = ctx;
        const canManageFullAccess = isActorAdmin || isActorOwner;
        // Display strings only — scoping is by repoAccess.projectId.
        const owner = repoAccess.ownerLogin;
        const repo = repoAccess.repoName;

        const collaborator = await findProjectCollaborator(
          repoAccess.projectId,
          input.collaboratorId
        );

        if (!canManageFullAccess && collaborator.role === "full-access") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only admins or the project owner can remove full-access collaborators.",
          });
        }

        const deleted = await db
          .delete(collaboratorTable)
          .where(
            and(
              eq(collaboratorTable.id, input.collaboratorId),
              eq(collaboratorTable.projectId, repoAccess.projectId)
            )
          )
          .returning();

        if (deleted.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to delete collaborator",
          });
        }

        await db
          .delete(collaboratorInviteTable)
          .where(
            and(
              sql`lower(${collaboratorInviteTable.email}) = lower(${collaborator.email})`,
              eq(collaboratorInviteTable.projectId, repoAccess.projectId)
            )
          );

        return {
          message: `Invitation to ${collaborator.email} for "${owner}/${repo}" successfully removed.`,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /**
   * Resends the invite email for a pending collaborator (new token).
   */
  resend: collaboratorManageProcedure
    .input(z.object({ collaboratorId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const { repoAccess, isActorAdmin, isActorOwner } = ctx;
        // Display strings only — scoping is by repoAccess.projectId.
        const owner = repoAccess.ownerLogin;
        const repo = repoAccess.repoName;
        const user = ctx.session.user;

        const collaborator = await findProjectCollaborator(
          repoAccess.projectId,
          input.collaboratorId
        );
        if (collaborator.userId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${collaborator.email} already joined.`,
          });
        }
        if (!(isActorAdmin || isActorOwner) && collaborator.role === "full-access") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only admins or the project owner can manage full-access collaborators.",
          });
        }
        await assertInviteQuota(repoAccess.projectId, 1);

        const baseUrl = getHubBaseUrl();
        const inviteUrl = await createInviteUrl({
          email: collaborator.email,
          projectId: repoAccess.projectId,
          owner,
          repo,
        });

        const { error } = await emailService.send({
          from: EMAIL_FROM,
          to: collaborator.email,
          subject: `Join "${owner}/${repo}" on Client Hub`,
          react: CollaboratorInviteEmail({
            inviteUrl,
            repoName: `${owner}/${repo}`,
            email: collaborator.email,
            invitedByName: user.name || user.email,
            invitedByUrl: baseUrl,
          }),
        });
        if (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error,
          });
        }

        return { message: `Invitation email resent to ${collaborator.email}.` };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),

  /**
   * Changes a collaborator's role. Non-admins can neither grant full access
   * nor touch an existing full-access collaborator.
   */
  changeRole: collaboratorManageProcedure
    .input(
      z.object({
        collaboratorId: z.number().int(),
        role: z.enum(COLLABORATOR_ROLE_VALUES),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { repoAccess, isActorAdmin, isActorOwner } = ctx;
        const canManageFullAccess = isActorAdmin || isActorOwner;

        const collaborator = await findProjectCollaborator(
          repoAccess.projectId,
          input.collaboratorId
        );

        if (
          !canManageFullAccess &&
          (input.role === "full-access" ||
            collaborator.role === "full-access")
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Only admins or the project owner can manage full-access collaborators.",
          });
        }

        await db
          .update(collaboratorTable)
          .set({ role: input.role })
          .where(eq(collaboratorTable.id, collaborator.id));

        return { message: `Role updated for ${collaborator.email}.` };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw toTRPCError(error);
      }
    }),
});
