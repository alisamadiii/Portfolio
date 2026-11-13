import type { CollaboratorRole } from "@workspace/drizzle/schema";

// Client-safe member rules (no server deps): the Members page and the
// collaborators router both read them, so the UI never offers what the server
// would reject.

export type MemberStatus = "active" | "pending" | "expired";

/**
 * A collaborator is active once bound to an account. Unbound rows are pending
 * while their invite link is still valid; with no valid link they're expired
 * (and grant nothing until the invite is resent and claimed).
 */
export const memberStatus = (
  userId: string | null,
  inviteExpiresAt: Date | null,
  now = new Date()
): MemberStatus =>
  userId ? "active" : inviteExpiresAt && inviteExpiresAt > now ? "pending" : "expired";

/** Roles an actor may grant: full access only by admins and the owner. */
export const assignableRoles = (canManageFullAccess: boolean): CollaboratorRole[] =>
  canManageFullAccess
    ? ["full-access", "content-editor", "view-only"]
    : ["content-editor", "view-only"];

/** Whether an actor may change or remove a collaborator holding `role`. */
export const canManageMember = (
  role: CollaboratorRole,
  canManageFullAccess: boolean
): boolean => canManageFullAccess || role !== "full-access";

/** Max emails per invite request and invite emails per project per hour. */
export const INVITE_BATCH_MAX = 10;
export const INVITES_PER_HOUR = 30;
