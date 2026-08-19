import { cache } from "react";
import { headers } from "next/headers";
import { initTRPC, TRPCError } from "@trpc/server";
import z from "zod";

import { auth } from "@workspace/auth/auth";

import { getToken } from "./lib/cms/token";
import { type User } from "./lib/cms/types";

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
// CMS-scoped: requires `owner`/`repo` in the input, resolves the caller's
// token for that repo, and injects `user` + `token` into ctx. Individual
// procedures merge their own input on top (e.g. `branch`).
export const cmsProcedure = authenticatedProcedure
  .input(z.object({ owner: z.string(), repo: z.string() }))
  .use(async ({ next, ctx, input }) => {
    const user = ctx.session.user as User;
    const { token, role } = await getToken(user, input.owner, input.repo);
    if (!token) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Token not found" });
    }

    return next({ ctx: { ...ctx, user, token, role } });
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
