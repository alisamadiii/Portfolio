import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import z from "zod";

import { getErrorMessage } from "@workspace/ui/lib/utils";

import { db } from "@workspace/drizzle/index";
import {
  clientNotifications,
  clientNotificationStatusValues,
  projectsTypeValues,
  user,
} from "@workspace/drizzle/schema";
import { sendEmail } from "@workspace/email/index";

import {
  adminProcedure,
  authenticatedProcedure,
  createTRPCRouter,
} from "../init";
import { notify } from "../lib/notify";
import { rateLimit } from "../middleware/rate-limit";

export const notificationRouter = createTRPCRouter({
  send: authenticatedProcedure
    .input(
      z.object({
        subject: z.string().min(1),
        message: z.string().min(10),
        priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
        projectType: z.enum(projectsTypeValues),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (ctx.session.user.role !== "admin") {
          await rateLimit(10, 1800000);
        }

        const [record] = await db
          .insert(clientNotifications)
          .values({
            email: ctx.session.user.email,
            projectType: input.projectType,
            subject: input.subject,
            message: input.message,
            priority: input.priority,
          })
          .returning({ id: clientNotifications.id });

        notify({
          clientEmail: ctx.session.user.email,
          projectType: input.projectType,
          subject: input.subject,
          message: input.message,
          priority: input.priority,
          referenceId: record.id,
        });

        return { id: record.id };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: getErrorMessage(error),
          cause: error,
        });
      }
    }),

  history: authenticatedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(clientNotifications)
      .where(eq(clientNotifications.email, ctx.session.user.email))
      .orderBy(desc(clientNotifications.createdAt));
  }),

  updateStatus: adminProcedure
    .input(
      z.object({
        notificationId: z.string().uuid(),
        status: z.enum(clientNotificationStatusValues),
      })
    )
    .mutation(async ({ input }) => {
      await db
        .update(clientNotifications)
        .set({
          status: input.status,
          updatedAt: new Date(),
          ...(input.status === "SEEN" ? { seenAt: new Date() } : {}),
        })
        .where(eq(clientNotifications.id, input.notificationId));
    }),

  list: adminProcedure.query(async () => {
    return db
      .select({
        id: clientNotifications.id,
        email: clientNotifications.email,
        projectType: clientNotifications.projectType,
        subject: clientNotifications.subject,
        message: clientNotifications.message,
        priority: clientNotifications.priority,
        status: clientNotifications.status,
        createdAt: clientNotifications.createdAt,
        seenAt: clientNotifications.seenAt,
        updatedAt: clientNotifications.updatedAt,
        userName: user.name,
        userImage: user.image,
        userId: user.id,
      })
      .from(clientNotifications)
      .leftJoin(user, eq(clientNotifications.email, user.email))
      .orderBy(desc(clientNotifications.createdAt));
  }),

  sendToUser: adminProcedure
    .input(
      z.object({
        to: z.string().email(),
        subject: z.string().min(1),
        message: z.string().min(1),
        notificationId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ input }) => {
      let originalSubject: string | undefined;
      let originalMessage: string | undefined;
      let clientEmail: string | undefined;

      if (input.notificationId) {
        const [notification] = await db
          .select({
            subject: clientNotifications.subject,
            message: clientNotifications.message,
            email: clientNotifications.email,
          })
          .from(clientNotifications)
          .where(eq(clientNotifications.id, input.notificationId));

        if (notification) {
          originalSubject = notification.subject;
          originalMessage = notification.message;
          clientEmail = notification.email ?? undefined;
        }
      }

      const result = await sendEmail("clientMessage", input.to, {
        subject: input.subject,
        message: input.message,
        clientEmail,
        originalSubject,
        originalMessage,
        referenceId: input.notificationId,
      });

      if (result.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error,
        });
      }

      if (input.notificationId) {
        await db
          .update(clientNotifications)
          .set({ status: "REPLIED", updatedAt: new Date() })
          .where(eq(clientNotifications.id, input.notificationId));
      }
    }),
});
