import { cache } from "react";
import { headers } from "next/headers";
import { initTRPC, TRPCError } from "@trpc/server";
import z from "zod";

import { auth } from "@workspace/auth/auth";

import { isAdminUser, roleAtLeast } from "./lib/authz-shared";
import {
  getRepoAccessByRepoId,
  requireCollaboratorManageAccess,
} from "./lib/cms/authz";
import { collaboratorMatchesUser } from "./lib/cms/collaborator-access";
import { db } from "./lib/cms/db";
import { toTRPCError } from "./lib/cms/errors";
import { resolveRepoToken } from "./lib/cms/repo-token";
import { getToken } from "./lib/cms/token";

export const createTRPCContext = cache(async () => {});

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
const t = initTRPC.create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  // transformer: superjson,
});
// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

export const baseProcedure = t.procedure;
export const authenticatedProcedure = baseProcedure.use(
  async ({ next, ctx }) => {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    // Session is already fetched and cached in context (via React cache())
    if (!session) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to access this resource",
      });
    }

    return next({
      ctx: {
        ...ctx,
        session,
      },
    });
  }
);
// CMS-scoped: requires `repoId` in the input (the project's stable identity),
// resolves the caller's token for that project, and injects `user` + `token` +
// the derived `owner`/`repo` (display + GitHub REST) into ctx. Individual
// procedures merge their own input on top (e.g. `branch`).
export const cmsProcedure = authenticatedProcedure
  .input(z.object({ repoId: z.number().int().positive() }))
  .use(async ({ next, ctx, input }) => {
    const user = ctx.session.user;
    const { token, role, owner, repo } = await getToken(user, input.repoId);
    if (!token) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Token not found" });
    }

    return next({
      ctx: { ...ctx, user, token, role, owner, repo, repoId: input.repoId },
    });
  });

// Server-to-server only: guarded by a shared secret header, never a browser session.
export const internalProcedure = baseProcedure.use(async ({ next, ctx }) => {
  const secret = process.env.INTERNAL_API_SECRET;
  const provided = (await headers()).get("x-internal-secret");

  if (!secret || provided !== secret) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid internal secret",
    });
  }

  return next({ ctx });
});

export const adminProcedure = authenticatedProcedure.use(
  async ({ next, ctx }) => {
    if (ctx.session.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not authorized to access this resource",
      });
    }

    return next({ ctx });
  }
);

// Collaborator-aware: `collaborations` is the caller's collaborator rows, or
// null for admins (unrestricted — no rows to filter against).
export const collaboratorProcedure = authenticatedProcedure.use(
  async ({ next, ctx }) => {
    const user = ctx.session.user;
    const isAdmin = isAdminUser(user);

    // Retry once: the shared Neon WebSocket pool can drop a query on cold start.
    const query = () =>
      db.query.hubCollaborator.findMany({
        where: collaboratorMatchesUser(user),
      });
    const collaborations = isAdmin ? null : await query().catch(query);

    return next({ ctx: { ...ctx, isAdmin, collaborations } });
  }
);

// CMS write: content-editor or full-access collaborators (and admins).
export const cmsWriteProcedure = cmsProcedure.use(async ({ next, ctx }) => {
  if (!roleAtLeast(ctx.role, "content-editor")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You have view-only access.",
    });
  }

  return next({ ctx });
});

// CMS full access: repo settings, branches, anything destructive.
export const cmsFullAccessProcedure = cmsProcedure.use(
  async ({ next, ctx }) => {
    if (ctx.role !== "full-access") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Full access required.",
      });
    }

    return next({ ctx });
  }
);

// Collaborator management: admins or full-access collaborators of the repo.
// Injects `repoAccess` (DB-only lookup) and `isActorAdmin`.
export const collaboratorManageProcedure = authenticatedProcedure
  .input(z.object({ repoId: z.number().int().positive() }))
  .use(async ({ next, ctx, input }) => {
    let access;
    try {
      access = await requireCollaboratorManageAccess(
        ctx.session.user,
        input.repoId
      );
    } catch (error) {
      throw toTRPCError(error);
    }

    return next({ ctx: { ...ctx, ...access } });
  });

// Admin-only repo access. Injects the admin's own GitHub token + DB repoAccess.
export const adminRepoProcedure = adminProcedure
  .input(z.object({ repoId: z.number().int().positive() }))
  .use(async ({ next, ctx, input }) => {
    try {
      const repoAccess = await getRepoAccessByRepoId(input.repoId);
      const token = await resolveRepoToken(
        repoAccess.ownerLogin,
        repoAccess.repoName,
        ctx.session.user.id
      );
      return next({ ctx: { ...ctx, token, repoAccess } });
    } catch (error) {
      throw toTRPCError(error);
    }
  });
