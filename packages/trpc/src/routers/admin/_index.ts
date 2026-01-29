import { TRPCError } from "@trpc/server";
import { desc, ilike, or, sql } from "drizzle-orm";
import z from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { files } from "@workspace/drizzle/schema";

import { adminSourcesRouter } from "./source/_index";
import { adminUsersRouter } from "./users";

export const adminRouter = createTRPCRouter({
  users: adminUsersRouter,
  sources: adminSourcesRouter,
  getFiles: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const { search } = input;
        const fileList = await db
          .select()
          .from(files)
          .orderBy(desc(files.createdAt))
          .where(
            search
              ? or(
                  ilike(files.url, `%${search}%`),
                  ilike(files.name, `%${search}%`),
                  ilike(files.contentType, `%${search}%`),
                  sql`${files.id}::text ILIKE ${`%${search}%`}`
                )
              : undefined
          );

        return fileList;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to fetch files",
          cause: error,
        });
      }
    }),
});
