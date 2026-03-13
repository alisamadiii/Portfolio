import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import z from "zod";

import { db } from "@workspace/drizzle/index";
import {
  notificationPriorityValues,
  notifications,
  notificationTypeValues,
  projectsTypeValues,
} from "@workspace/drizzle/schema";

import { authenticatedProcedure, createTRPCRouter } from "../init";
import { sendSlackNotification } from "../lib/slack.service";

export const notificationRouter = createTRPCRouter({
  get: authenticatedProcedure
    .input(
      z.object({
        project: z.enum(projectsTypeValues).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const notificationsList = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.actorId, ctx.session.user.id),
              input.project
                ? eq(notifications.projectType, input.project)
                : undefined
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
              : "Failed to get notifications",
          cause: error,
        });
      }
    }),
  history: authenticatedProcedure
    .input(
      z.object({
        project: z.enum(projectsTypeValues).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const notificationsList = await db
          .select()
          .from(notifications)
          .where(eq(notifications.actorId, ctx.session.user.id))
          .orderBy(desc(notifications.createdAt));
        return notificationsList;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get notification history",
          cause: error,
        });
      }
    }),
  sentNotifications: authenticatedProcedure
    .input(
      z.object({
        project: z.enum(projectsTypeValues).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const notificationsList = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.actorId, ctx.session.user.id),
              input.project
                ? eq(notifications.projectType, input.project)
                : undefined,
              isNull(notifications.seenAt)
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
  send: authenticatedProcedure
    .input(
      z.object({
        recipientId: z.string().optional(),
        projectType: z.enum(projectsTypeValues).optional(),
        type: z.enum(notificationTypeValues).optional(),
        priority: z.enum(notificationPriorityValues),
        subject: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { recipientId, projectType, type, priority, subject, message } =
          input;

        const [notification] = await db
          .insert(notifications)
          .values({
            recipientId,
            projectType,
            type,
            subject,
            message,
            actorId: ctx.session.user.id,
            priority,
          })
          .returning();

        await sendSlackNotification({
          requesterId: recipientId,
          subject,
          message,
          priority,
          projectType,
          actorName: ctx.session.user.name,
          email: ctx.session.user.email,
          userId: ctx.session.user.id,
        });

        return notification;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to send notification",
          cause: error,
        });
      }
    }),
  seenNotifications: authenticatedProcedure
    .input(
      z.object({
        recipientId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        await db
          .update(notifications)
          .set({ seenAt: new Date() })
          .where(eq(notifications.id, input.recipientId))
          .returning();

        return true;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get seen notifications",
          cause: error,
        });
      }
    }),

  deleteAccountNotification: authenticatedProcedure.query(async ({ ctx }) => {
    try {
      const deleted = await db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.actorId, ctx.session.user.id),
            eq(notifications.type, "ACCOUNT_DELETION_REQUEST")
          )
        )
        .then((data) => data[0]);

      if (!deleted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No account deletion notification found",
        });
      }

      return deleted;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to get account deletion notification",
        cause: error,
      });
    }
  }),
});
