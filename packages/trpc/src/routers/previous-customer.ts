import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "@workspace/drizzle/index";
import { previousCustomers } from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";

export const previousCustomerRouter = createTRPCRouter({
  get: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const customer = await db
        .select()
        .from(previousCustomers)
        .where(eq(previousCustomers.email, ctx.session.user.email))
        .limit(1)
        .then((result) => result[0]);
      return customer;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get previous customers",
        cause: error,
      });
    }
  }),
});
