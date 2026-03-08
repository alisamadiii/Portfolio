import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import {
  notifications,
  notificationStatusValues,
  projectsTypeValues,
} from "@workspace/drizzle/schema";

export const adminNotificationRouter = createTRPCRouter({
  sentNotifications: adminProcedure
    .input(
      z.object({
        project: z.enum(projectsTypeValues).optional(),
        userId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const notificationsList = await db
          .select()
          .from(notifications)
          .where(
            and(
              input.project
                ? eq(notifications.projectType, input.project)
                : undefined,
              input.userId ? eq(notifications.actorId, input.userId) : undefined
            )
          )
          .orderBy(desc(notifications.createdAt));

        return notificationsList;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get sent notifications",
          cause: error,
        });
      }
    }),
  updateNotification: adminProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(notificationStatusValues),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, status } = input;

        const notification = await db
          .update(notifications)
          .set({ status, seenAt: null })
          .where(eq(notifications.id, id))
          .returning();

        return notification;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to update notification",
          cause: error,
        });
      }
    }),
});
