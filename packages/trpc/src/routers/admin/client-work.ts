import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { clientWork } from "@workspace/drizzle/schema";

export const adminClientWorkRouter = createTRPCRouter({
  get: adminProcedure.query(async () => {
    try {
      const clientWorkList = await db.select().from(clientWork);
      return clientWorkList;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch client work",
        cause: error,
      });
    }
  }),
  add: adminProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string(),
        url: z.string(),
        thumbnail: z.string(),
        from: z.enum(["crosspost", "bless", "area"]),
        width: z.number(),
        height: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const [work] = await db.insert(clientWork).values(input).returning();
        if (!work) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to add client work",
          });
        }

        return work;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to add client work",
          cause: error,
        });
      }
    }),
  delete: adminProcedure.input(z.string()).mutation(async ({ input }) => {
    try {
      const [work] = await db
        .delete(clientWork)
        .where(eq(clientWork.id, input))
        .returning();
      if (!work) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Client work not found",
        });
      }
      return work;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to delete client work",
        cause: error,
      });
    }
  }),
});
