import { cache } from "react";
import { headers } from "next/headers";
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

import { auth } from "@workspace/auth/auth";
import { projectsTypeValues } from "@workspace/drizzle/schema";

import { rateLimit } from "./middleware/rate-limit";

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

    return next({ ctx: { ...ctx, session } });
  }
);
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

/**
 * ================================
 * ClickUp
 * ================================
 */
const notificationsSchema = z.object({
  list: z.enum(["notifications"]).default("notifications").optional(),
  projectType: z.enum(projectsTypeValues),
});
const clickUp: {
  id: string;
  name: z.infer<typeof notificationsSchema>["list"];
}[] = [
  {
    id: "901414507174",
    name: "notifications",
  },
];

export const notificationsProcedure = baseProcedure
  .input(notificationsSchema)
  .use(async ({ next, ctx }) => {
    await rateLimit(10, 60000); // 10 requests per minute
    return next({ ctx });
  })
  .use(async ({ next, ctx, input }) => {
    console.log(input.list);
    let listId = clickUp.find((list) => list.name === input.list)?.id;

    if (!listId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid list name",
      });
    }

    let email;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session) {
      email = session.user.email;
    }

    return next({
      ctx: {
        ...ctx,
        listId,
        projectType: input.projectType,
        email,
      },
    });
  });
