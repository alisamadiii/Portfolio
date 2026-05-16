import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import z from "zod";

import { getErrorMessage } from "@workspace/ui/lib/utils";

import { adminProcedure, createTRPCRouter } from "@workspace/trpc/init";
import { db } from "@workspace/drizzle/index";
import { coldEmails } from "@workspace/drizzle/schema";
import { email } from "@workspace/email/index";
import ReachOutToClients from "@workspace/email/emails/reach-out-to-clients";

export const coldEmailsRouter = createTRPCRouter({
  send: adminProcedure
    .input(
      z.object({
        email: z.string(),
        clientName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existingColdEmail = await db
          .select()
          .from(coldEmails)
          .where(eq(coldEmails.email, input.email));

        if (existingColdEmail.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cold email already sent",
          });
        }

        await email.send({
          from: "agency@alisamadii.com",
          to: input.email,
          subject: "A quick note about your online presence",
          react: ReachOutToClients({ email: input.email }),
        });
        await db.insert(coldEmails).values({ email: input.email });
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: getErrorMessage(error),
          cause: error,
        });
      }
    }),
  list: adminProcedure.query(async () => {
    try {
      const coldEmailsResult = await db
        .select()
        .from(coldEmails)
        .orderBy(desc(coldEmails.createdAt));
      return coldEmailsResult;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: getErrorMessage(error),
        cause: error,
      });
    }
  }),
});
